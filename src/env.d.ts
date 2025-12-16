namespace NodeJS{
    interface ProcessEnv{
        DATABASE_URL: string,
        PORT: number,
        SECRET_KEY: string,
        REDIS_CONNECTION_STRING: string
    }
}