# Blob store
- This is the directory for handling the blob storage solution used for storing our files.

## Local development
- Reminder that you will need a blob store connection string in your env file in order to run this locally via azurite.

## Singleton
- Blob store is initiated as a singleton on the service class, shared amongst requests.

## Connection String
- If developing locally you should pass a connection string to connect to the blob store for convenience.