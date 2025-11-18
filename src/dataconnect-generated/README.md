# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetPublicMovieLists*](#getpublicmovielists)
  - [*GetMoviesInList*](#getmoviesinlist)
- [**Mutations**](#mutations)
  - [*CreateMovieList*](#createmovielist)
  - [*AddMovieToList*](#addmovietolist)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetPublicMovieLists
You can execute the `GetPublicMovieLists` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPublicMovieLists(): QueryPromise<GetPublicMovieListsData, undefined>;

interface GetPublicMovieListsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPublicMovieListsData, undefined>;
}
export const getPublicMovieListsRef: GetPublicMovieListsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPublicMovieLists(dc: DataConnect): QueryPromise<GetPublicMovieListsData, undefined>;

interface GetPublicMovieListsRef {
  ...
  (dc: DataConnect): QueryRef<GetPublicMovieListsData, undefined>;
}
export const getPublicMovieListsRef: GetPublicMovieListsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPublicMovieListsRef:
```typescript
const name = getPublicMovieListsRef.operationName;
console.log(name);
```

### Variables
The `GetPublicMovieLists` query has no variables.
### Return Type
Recall that executing the `GetPublicMovieLists` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPublicMovieListsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPublicMovieListsData {
  movieLists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
  } & MovieList_Key)[];
}
```
### Using `GetPublicMovieLists`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPublicMovieLists } from '@dataconnect/generated';


// Call the `getPublicMovieLists()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPublicMovieLists();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPublicMovieLists(dataConnect);

console.log(data.movieLists);

// Or, you can use the `Promise` API.
getPublicMovieLists().then((response) => {
  const data = response.data;
  console.log(data.movieLists);
});
```

### Using `GetPublicMovieLists`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPublicMovieListsRef } from '@dataconnect/generated';


// Call the `getPublicMovieListsRef()` function to get a reference to the query.
const ref = getPublicMovieListsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPublicMovieListsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movieLists);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movieLists);
});
```

## GetMoviesInList
You can execute the `GetMoviesInList` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMoviesInList(vars: GetMoviesInListVariables): QueryPromise<GetMoviesInListData, GetMoviesInListVariables>;

interface GetMoviesInListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMoviesInListVariables): QueryRef<GetMoviesInListData, GetMoviesInListVariables>;
}
export const getMoviesInListRef: GetMoviesInListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMoviesInList(dc: DataConnect, vars: GetMoviesInListVariables): QueryPromise<GetMoviesInListData, GetMoviesInListVariables>;

interface GetMoviesInListRef {
  ...
  (dc: DataConnect, vars: GetMoviesInListVariables): QueryRef<GetMoviesInListData, GetMoviesInListVariables>;
}
export const getMoviesInListRef: GetMoviesInListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMoviesInListRef:
```typescript
const name = getMoviesInListRef.operationName;
console.log(name);
```

### Variables
The `GetMoviesInList` query requires an argument of type `GetMoviesInListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMoviesInListVariables {
  movieListId: UUIDString;
}
```
### Return Type
Recall that executing the `GetMoviesInList` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMoviesInListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMoviesInListData {
  movieList?: {
    movieListItems_on_movieList: ({
      movie: {
        id: UUIDString;
        title: string;
        year: number;
      } & Movie_Key;
        note?: string | null;
        position: number;
    })[];
  };
}
```
### Using `GetMoviesInList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMoviesInList, GetMoviesInListVariables } from '@dataconnect/generated';

// The `GetMoviesInList` query requires an argument of type `GetMoviesInListVariables`:
const getMoviesInListVars: GetMoviesInListVariables = {
  movieListId: ..., 
};

// Call the `getMoviesInList()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMoviesInList(getMoviesInListVars);
// Variables can be defined inline as well.
const { data } = await getMoviesInList({ movieListId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMoviesInList(dataConnect, getMoviesInListVars);

console.log(data.movieList);

// Or, you can use the `Promise` API.
getMoviesInList(getMoviesInListVars).then((response) => {
  const data = response.data;
  console.log(data.movieList);
});
```

### Using `GetMoviesInList`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMoviesInListRef, GetMoviesInListVariables } from '@dataconnect/generated';

// The `GetMoviesInList` query requires an argument of type `GetMoviesInListVariables`:
const getMoviesInListVars: GetMoviesInListVariables = {
  movieListId: ..., 
};

// Call the `getMoviesInListRef()` function to get a reference to the query.
const ref = getMoviesInListRef(getMoviesInListVars);
// Variables can be defined inline as well.
const ref = getMoviesInListRef({ movieListId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMoviesInListRef(dataConnect, getMoviesInListVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movieList);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movieList);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateMovieList
You can execute the `CreateMovieList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createMovieList(vars: CreateMovieListVariables): MutationPromise<CreateMovieListData, CreateMovieListVariables>;

interface CreateMovieListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMovieListVariables): MutationRef<CreateMovieListData, CreateMovieListVariables>;
}
export const createMovieListRef: CreateMovieListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMovieList(dc: DataConnect, vars: CreateMovieListVariables): MutationPromise<CreateMovieListData, CreateMovieListVariables>;

interface CreateMovieListRef {
  ...
  (dc: DataConnect, vars: CreateMovieListVariables): MutationRef<CreateMovieListData, CreateMovieListVariables>;
}
export const createMovieListRef: CreateMovieListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMovieListRef:
```typescript
const name = createMovieListRef.operationName;
console.log(name);
```

### Variables
The `CreateMovieList` mutation requires an argument of type `CreateMovieListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMovieListVariables {
  name: string;
  description?: string | null;
  isPublic: boolean;
}
```
### Return Type
Recall that executing the `CreateMovieList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMovieListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMovieListData {
  movieList_insert: MovieList_Key;
}
```
### Using `CreateMovieList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMovieList, CreateMovieListVariables } from '@dataconnect/generated';

// The `CreateMovieList` mutation requires an argument of type `CreateMovieListVariables`:
const createMovieListVars: CreateMovieListVariables = {
  name: ..., 
  description: ..., // optional
  isPublic: ..., 
};

// Call the `createMovieList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMovieList(createMovieListVars);
// Variables can be defined inline as well.
const { data } = await createMovieList({ name: ..., description: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMovieList(dataConnect, createMovieListVars);

console.log(data.movieList_insert);

// Or, you can use the `Promise` API.
createMovieList(createMovieListVars).then((response) => {
  const data = response.data;
  console.log(data.movieList_insert);
});
```

### Using `CreateMovieList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMovieListRef, CreateMovieListVariables } from '@dataconnect/generated';

// The `CreateMovieList` mutation requires an argument of type `CreateMovieListVariables`:
const createMovieListVars: CreateMovieListVariables = {
  name: ..., 
  description: ..., // optional
  isPublic: ..., 
};

// Call the `createMovieListRef()` function to get a reference to the mutation.
const ref = createMovieListRef(createMovieListVars);
// Variables can be defined inline as well.
const ref = createMovieListRef({ name: ..., description: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMovieListRef(dataConnect, createMovieListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movieList_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movieList_insert);
});
```

## AddMovieToList
You can execute the `AddMovieToList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addMovieToList(vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;

interface AddMovieToListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
}
export const addMovieToListRef: AddMovieToListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addMovieToList(dc: DataConnect, vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;

interface AddMovieToListRef {
  ...
  (dc: DataConnect, vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
}
export const addMovieToListRef: AddMovieToListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addMovieToListRef:
```typescript
const name = addMovieToListRef.operationName;
console.log(name);
```

### Variables
The `AddMovieToList` mutation requires an argument of type `AddMovieToListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddMovieToListVariables {
  movieListId: UUIDString;
  movieId: UUIDString;
  note?: string | null;
  position: number;
}
```
### Return Type
Recall that executing the `AddMovieToList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddMovieToListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddMovieToListData {
  movieListItem_insert: MovieListItem_Key;
}
```
### Using `AddMovieToList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addMovieToList, AddMovieToListVariables } from '@dataconnect/generated';

// The `AddMovieToList` mutation requires an argument of type `AddMovieToListVariables`:
const addMovieToListVars: AddMovieToListVariables = {
  movieListId: ..., 
  movieId: ..., 
  note: ..., // optional
  position: ..., 
};

// Call the `addMovieToList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addMovieToList(addMovieToListVars);
// Variables can be defined inline as well.
const { data } = await addMovieToList({ movieListId: ..., movieId: ..., note: ..., position: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addMovieToList(dataConnect, addMovieToListVars);

console.log(data.movieListItem_insert);

// Or, you can use the `Promise` API.
addMovieToList(addMovieToListVars).then((response) => {
  const data = response.data;
  console.log(data.movieListItem_insert);
});
```

### Using `AddMovieToList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addMovieToListRef, AddMovieToListVariables } from '@dataconnect/generated';

// The `AddMovieToList` mutation requires an argument of type `AddMovieToListVariables`:
const addMovieToListVars: AddMovieToListVariables = {
  movieListId: ..., 
  movieId: ..., 
  note: ..., // optional
  position: ..., 
};

// Call the `addMovieToListRef()` function to get a reference to the mutation.
const ref = addMovieToListRef(addMovieToListVars);
// Variables can be defined inline as well.
const ref = addMovieToListRef({ movieListId: ..., movieId: ..., note: ..., position: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addMovieToListRef(dataConnect, addMovieToListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movieListItem_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movieListItem_insert);
});
```

