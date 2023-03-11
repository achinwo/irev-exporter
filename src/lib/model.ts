import Objection, {
    CloneOptions,
    Constructor,
    Model,
    ModelClass,
    ModelOptions,
    Pojo,
    QueryContext,
    RelationExpression,
    QueryBuilder,
    snakeCaseMappers, SingleQueryBuilder, ModelObject, QueryBuilderType, ArrayQueryBuilder, TransactionOrKnex
} from 'objection'
import Knex from 'knex'
import "reflect-metadata";
import * as JsonPath from 'jmespath';

import _ from 'lodash';
import moment from "moment";

const knexConfig = require('../../knexfile');

const REGEXP = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/;


export const knex = Knex(knexConfig[process.env.NODE_ENV || 'development']);

export function isBcryptHash(str): boolean {
    return REGEXP.test(str)
}

export interface FindOpts<T extends DbModel> {
    eager?: RelationExpression<T>
    eagerAll?: boolean
    trxOrKnex?: TransactionOrKnex,
    includeDeleted?: boolean
}


const columnMetadataKey = Symbol("column");

export enum SchemaType {
    object = 'object',
    string = 'string',
    boolean = 'boolean',
    number = 'number',
    integer = 'integer',
    date = 'date',
    datetime = 'datetime',
    text = 'text',
    uuid = 'uuid',
}

function schemaTypeToJson(type: SchemaType): { type: string, format?: string } {
    switch (type) {
        case SchemaType.datetime:
            return {type: SchemaType.string.valueOf(), format: 'date-time'}
        case SchemaType.date:
            return {type: SchemaType.string.valueOf(), format: 'date'}
        case SchemaType.text:
            return {type: SchemaType.string.valueOf()}
        case SchemaType.uuid:
            return {type: SchemaType.string.valueOf(), format: 'uuid'}
        default:
            return {type: type.toString()}
    }
}

type ColumnOptions = { nullable: boolean, name?: string, colName?: string, type?: SchemaType, unique?: boolean, enum?: string[], jsonPath?: string}

export function col(type: SchemaType, options: ColumnOptions | boolean | null = null) {

    // @ts-ignore
    const target = Reflect.metadata(columnMetadataKey, options)

    return new Proxy(target, {
        apply: function (target, targetThis, [cls, attrName, attrValue]) {
            //
            const reg = MODELS[cls.constructor.name] || {columns: [], cls}

            let colName = _.snakeCase(attrName);
            let name = attrName;

            let opts: ColumnOptions;

            //var t = Reflect.getMetadata("design:type", cls, attrName);
            //console.log(`${attrName} type: ${t}`);

            //Object.getPrototypeOf(opts)

            if (_.isNull(options) || _.isString(options)) {
                opts = {nullable: true, colName, name, type}
            } else if (typeof options == 'boolean') {
                opts = {nullable: options, colName, name, type}
            } else {
                opts = _.merge({}, options, {colName, name, type})
            }

            reg.columns.push(opts)

            MODELS[cls.constructor.name] = reg
            //console.log("Something!!", name, cls.constructor.name)
            return target.apply(targetThis, [cls, attrName, attrValue]) //.apply(decorator, [value, [cls, attrName, attrValue]]);
        }
    });
}


export interface DbModelClass<M extends DbModel> extends ModelClass<M> {
    applyFindOptions(query: QueryBuilderType<M>, opts: FindOpts<M>): QueryBuilder<M, M[]>

    id?: number;

    createdAt?: Date;

    createdBy?: number;

    deletedBy?: number;
    deletedAt?: Date;

    updatedAt?: Date;
    updatedBy?: number;

    deleteById: <T extends DbModel>(id: number | string, context?: any) => Promise<T | null>

    columns(): ColumnOptions[]
}

export interface User {
    name: string;
    passwordHash: string;
    email: string;
    id?: number;
}

const MODELS: { [key: string]: { cls: DbModelClass<DbModel>, columns: ColumnOptions[] } } = {};
const models = MODELS;

export abstract class DbModel extends Model {

    @col(SchemaType.integer, false) id?: number;


    @col(SchemaType.integer, false) createdById: number;
    @col(SchemaType.integer) deletedById?: number;
    @col(SchemaType.integer, false) updatedById: number;

    @col(SchemaType.datetime, false) createdAt: Date;
    @col(SchemaType.datetime) deletedAt?: Date;
    @col(SchemaType.datetime, false) updatedAt: Date;

    static get className(): string {
        return this.name;
    }

    static columnNames(): string[] {
        return this.columns().map((c) => c.name)
    }

    static columns(): ColumnOptions[] {
        const superCols: ColumnOptions[] = _.concat([], models[DbModel.name] ? models[DbModel.name].columns : [])
        return _.concat(superCols, models[this.name] ? models[this.name].columns : [])
    }

    $validate(json, options): Pojo {
        return json // Tony - turn off validation
    }

    static get virtualAttributes() {
        return [];
    }

    static get relationMappings() {
        const {User} = require('../orm/user');
        const attrNames = ['createdBy', 'updatedBy', 'deletedBy'];

        const rels = _.fromPairs(
            attrNames.map((attrName) => {
                const obj = {
                    relation: DbModel.HasOneRelation,
                    modelClass: User,
                    join: {
                        from: `${User.tableName}.id`,
                        to: `${this.tableName}.${attrName}Id`
                    }
                };
                return [`${attrName}User`, obj];
            }));
        return rels
    }

    static get jsonSchema() {
        const required = ['createdById', 'updatedById']
        const properties = {}
        for (let col of this.columns()) {
            properties[col.name] = schemaTypeToJson(col.type);

            if(!_.isEmpty(col.enum)){
                properties[col.name].enum = col.enum;
            }

            if (!col.nullable) {
                required.push(col.name);
            }
        }
        return {type: SchemaType[SchemaType.object], title: this.name, properties, required}
    };

    static get columnNameMappers() {
        return snakeCaseMappers();
    }

    static async fetchAll<T extends DbModel>(this: Constructor<T>, opts: FindOpts<T> = {}): Promise<ArrayQueryBuilder<QueryBuilderType<T>>> {
        let ModelCls = this as DbModelClass<T>;
        let query = ModelCls.query(opts.trxOrKnex)

        query = ModelCls.applyFindOptions(query, opts)
        return query;
    }

    static applyFindOptions<M extends DbModel>(this: Constructor<M>, query: QueryBuilder<M, M[]>, opts: FindOpts<M> = {}): QueryBuilder<M, M[]> {
        let ModelCls = this as DbModelClass<M>;
        if (opts.eager) {
            query = query.withGraphFetched(_.isString(opts.eager) ? {[opts.eager as string]: true} : opts.eager);
        } else if (opts.eagerAll) {
            const expr = _.fromPairs(_.map(Object.keys(ModelCls.relationMappings), k => [k, true]));
            query = query.withGraphFetched(expr);
        }

        if (!opts.includeDeleted) query = query.whereNull('deleted_at');
        return query.orderBy('updated_at');
    }

    static deleteById<T extends DbModel>(this: Constructor<T>, id: number | string, context?: any, relation?: RelationExpression<T>): SingleQueryBuilder<QueryBuilder<T>> {
        let ModelCls = this as ModelClass<T>;

        let mergedContext = _.merge({isDelete: true}, context || {});
        let query = ModelCls.query().context(mergedContext);

        if(!_.isEmpty(relation)){
            query = query.withGraphFetched(relation);
        }

        let update = {deletedAt: new Date()} as Partial<T>
        return query.updateAndFetchById(id, update) as SingleQueryBuilder<QueryBuilder<T>>;
    }

    static findById<T extends DbModel>(this: Constructor<T>, id: number | string, opts: FindOpts<T> = {}): SingleQueryBuilder<QueryBuilderType<T>> {
        let ModelCls = this as ModelClass<T>;
        let query = ModelCls.query(opts.trxOrKnex).where('id', '=', id);

        if (opts.eager) {
            query = query.withGraphFetched(_.isString(opts.eager) ? {[opts.eager as string]: true} : opts.eager);
        } else if (opts.eagerAll) {
            const expr = _.fromPairs(_.map(Object.keys(ModelCls.relationMappings), k => [k, true]));
            query = query.withGraphFetched(expr);
        }

        if (!opts.includeDeleted) query = query.whereNull('deleted_at');

        return query.first();
    }

    broadcastUpdates(){
        return true;
    }

    $afterInsert(queryContext: Objection.QueryContext): Promise<any> | void {
        return Promise.resolve(super.$afterInsert(queryContext))
            .then(() => {

            })
    }

    static DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss[Z]'

    async $beforeInsert(queryContext) {
        return Promise.resolve(super.$beforeInsert(queryContext))
            .then(() => {
                if (!this.createdAt) this.createdAt = moment.utc().toDate();
                if (!this.updatedAt) this.updatedAt = moment.utc().toDate();

                const user = queryContext.user as User;

                if (user) {
                    this.updatedById = this.createdById = user.id;
                }
            })

    }

    $beforeUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<any> | void {
        return Promise.resolve(super.$beforeUpdate(opt, queryContext))
            .then(() => {
                // @ts-ignore
                this.updatedAt = moment.utc().toDate();

                const user = queryContext.user as User;
                const isDelete = queryContext.isDelete as boolean;

                if (user) {
                    this.updatedById = user.id
                    this.deletedById = isDelete ? user.id : this.deletedById;
                }
            })
    }

    get isNew(): boolean {
        return !this.id
    }

    async save<T extends this>(): Promise<this> {
        let modelClass = this.constructor as ModelClass<T>;
        let newModel = await modelClass.query().insert(this.toJSON());

        let attrNames = Object.keys(modelClass.jsonSchema?.properties || {});
        for (let attrName of attrNames) {
            this[attrName] = newModel[attrName]
        }
        return this
    }

    toJSON(opt?: Objection.ToJsonOptions): ModelObject<this> {
        const json = super.toJSON(opt) as any;
        let ModelCls = this.constructor as DbModelClass<this>;
        const columns = _.fromPairs(ModelCls.columns().map((c) => [c.name, c]));

        const res = _.transform(json, function (result, value, key: string) {
            if (columns[key] && columns[key].type === SchemaType.datetime && value) {
                value = moment.utc(value).format('YYYY-MM-DD[T]HH:mm:ss[Z]');
            }

            if (columns[key] && columns[key].type === SchemaType.boolean && typeof value !== 'boolean') {
                value = Boolean(_.isString(value) ? _.toInteger(value) : value);
            }

            if(_.isPlainObject(value) && key in ModelCls.relationMappings){
                const modelClass = ModelCls.relationMappings[key]['modelClass']
                const relCols = _.fromPairs(modelClass.columns().map((c) => [c.name, c]));

                value = _.transform(value as any, function (relResult, relValue, relKey: string) {
                    if (relCols[relKey] && relCols[relKey].type === SchemaType.datetime && relValue) {
                        relValue = moment.utc(relValue).format('YYYY-MM-DD[T]HH:mm:ss[Z]');
                    }
                    relResult[relKey] = relValue;
                }, {})
            }

            result[key] = value;
        }, {});
        return res as ModelObject<this>;
    }

    toJson<T extends this>(opt?: CloneOptions): ModelObject<this> {
        return this.toJSON(opt);
    }

    applyUpdates<T extends this>(cls: DbModelClass<T>, updates: any){
        for(let col of cls.columns()){
            if(!_.has(updates, col.name)) continue;

            this[col.name] = updates[col.name];
        }
    }

    static extractFromData(data: any, columns: ColumnOptions[]): any {
        let obj: any = {}

        for(let col of columns){
            const jsonPath = col.jsonPath;

            if(!jsonPath) continue;

            obj[col.name] = JsonPath.search(data, jsonPath);
        }

        return obj;
    }

}

// Give the knex object to objection.
DbModel.knex(knex);


async function main() {

    // const person = User.query().insert({
    //     email: 'matt@damon.com',
    //     password: 'password123',
    //     firstName: 'Matt'
    // });
    // const person = User.query()
    //     .upsertGraph({ firstName: 'Obialo', id: 5 })
    //     .then((updatedRows) => {
    //         console.log('[updated]', updatedRows)
    //         // updatedRows === [{id: 42, title: 'The Hitchhiker's Guide to the Galaxy'}]
    //     })
    // return TrackView.query()
    //     .then(([user]) => {
    //         //console.dir(user);
    //         console.log(`[user] id=`, user.createdAt);
    //         console.log('[user] id=', user.toJSON());
    //         //console.log();
    //         //return user.verifyPassword('password123')
    //     })
    //     // .then((verified) => {
    //     //     console.log('[verified]', verified)
    //     // })
    //     .then(() => knex.destroy())
}

if (require.main === module) {
    main();
}
