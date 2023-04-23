import {col, DbModel, isBcryptHash, knex, SchemaType, User as UserInterface} from "../lib/model";
import Bcrypt from 'bcrypt'
import jwt from "jwt-simple";
import {SESSION_SECRET} from "../lib/model";
import moment from "moment";
import _ from 'lodash';
import Protocol from "devtools-protocol";
import integer = Protocol.integer;

export class User extends DbModel implements UserInterface {

    static tableName = 'users';

    @col(SchemaType.string, false) displayName: string;
    @col(SchemaType.string, {unique: true, nullable: false}) contributorId: string;

    @col(SchemaType.string, true) passwordHash: string;
    @col(SchemaType.string, true) email: string;

    @col(SchemaType.integer, true) role: number;

    @col(SchemaType.datetime) activatedAt: Date;
    @col(SchemaType.datetime) firstContributedAt: Date;

    @col(SchemaType.text, true) imageSmall: string; // 64x64
    @col(SchemaType.text, true) imageMedium: string; // 300x300
    @col(SchemaType.text, true) imageLarge: string; // 640x640

    password: string;
    sessions: Array<Session>;

    async createSession(extras: {expiresIn?:number, deviceUuid?: string}): Promise<Session> {
        return Session.query()
            .context({user: this})
            .insert({
                token: Session.generateToken(this.email, extras.expiresIn),
                userId: _.isString(this.id) ? _.toInteger(this.id) : this.id,
                deviceUuid: extras.deviceUuid
            })
    }

    $beforeInsert(context) {
        return Promise.resolve(super.$beforeInsert(context))
            .then(() => {
                // hash the password
                return this.generateHash()
            })
    }

    static get relationMappings (){
        return {
            sessions: {
                relation: DbModel.HasManyRelation,
                modelClass: Session,
                join: {
                    from: `${User.tableName}.id`,
                    to: `${Session.tableName}.user_id`
                }
            }
        }
    }

    $beforeUpdate(queryOptions, context) {
        return Promise.resolve(super.$beforeUpdate(queryOptions, context))
            .then(() => {
                if (queryOptions.patch && this.password === undefined) return;
                return this.generateHash()
            })
    }

    static async findByEmail(email:string):Promise<User|null>{
        return this.query().where('email', '=', email.toLowerCase()).first()
    }

    verifyPassword(password) {
        return Bcrypt.compare(password, this.passwordHash)
    }

    generateHash() {
        let options = {rounds: 10, allowEmptyPassword: true};
        const password = this.password;

        if (password) {
            if (isBcryptHash(password)) throw new Error('bcrypt tried to hash another bcrypt hash');

            return Bcrypt.hash(password, options.rounds)
                .then((hash) => {
                    this.passwordHash = hash;
                    delete this.password
                })
        }

        // throw an error if empty passwords aren't allowed
        if (!options.allowEmptyPassword) throw new Error('password must not be empty');

        return Promise.resolve()
    }
}

type SessionToken = { email: string, createdAt: Date, expiresIn: number }

export class Session extends DbModel {
    static tableName = 'sessions';
    static DEFAULT_EXPIRY_MS = 24 * 60 * 1000;

    @col(SchemaType.string, false) token: string;
    @col(SchemaType.integer, false) userId: number;
    @col(SchemaType.string, true) deviceUuid: string;

    user?: User;
    private _tokenData?: SessionToken;

    static generateToken(email: string, expiresIn?: number): string {
        return jwt.encode({
            email: email,
            createdAt: new Date(),
            expiresIn: expiresIn || this.DEFAULT_EXPIRY_MS
        }, SESSION_SECRET)
    }

    get tokenData(): SessionToken | null {
        if (!this.token) return null;
        else if (this._tokenData) return this._tokenData;

        let data = jwt.decode(this.token, SESSION_SECRET) as { email: string, createdAt: string, expiresIn: number };
        let createdAt = moment(data.createdAt).toDate();
        this._tokenData = {email: data.email, createdAt, expiresIn: data.expiresIn || Session.DEFAULT_EXPIRY_MS};

        return this._tokenData
    }

    get isExpired(): boolean {
        if (!this.tokenData) return true;

        let expiryTime = moment(this.tokenData.createdAt).add(this.tokenData.expiresIn, 'milliseconds');
        return moment() > expiryTime
    }

    static get relationMappings() {
        return {
            user: {
                relation: DbModel.HasOneRelation,
                modelClass: User,
                join: {
                    from: 'users.id',
                    to: 'sessions.user_id'
                }
            }
        }
    }
}

export type SessionExtended = Session & {user: User}

async function main() {
    console.log('Hello world!');


    try {
        let cls = await Session.findById(2, {eagerAll: true});
        console.log('Sessions:', cls.user.toJson());
    } finally {
        await knex.destroy()
    }

}

if (require.main === module) {
    main();
}
