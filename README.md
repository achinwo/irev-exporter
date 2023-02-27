###How to run
1. Run command; ```npm install```
2. Log into IReV portal with Network inspector open, extract your session token an set environment variable "SESSION_TOKEN".
3. Switch to the inspector "Application" tab, extract below JWTs from localStorage and set environment;
   1. "spa__user" -> "SESSION_SPA_USER"
   2. "spa__token" -> "SESSION_SPA_TOKEN"
   3. "undefined" -> "SESSION_SPA_UNDEFINED"
4. Run terminal command;
   ```gulp exportIrev```