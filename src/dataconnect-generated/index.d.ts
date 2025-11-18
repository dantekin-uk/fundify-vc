import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddMovieToListData {
  movieListItem_insert: MovieListItem_Key;
}

export interface AddMovieToListVariables {
  movieListId: UUIDString;
  movieId: UUIDString;
  note?: string | null;
  position: number;
}

export interface CreateMovieListData {
  movieList_insert: MovieList_Key;
}

export interface CreateMovieListVariables {
  name: string;
  description?: string | null;
  isPublic: boolean;
}

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

export interface GetMoviesInListVariables {
  movieListId: UUIDString;
}

export interface GetPublicMovieListsData {
  movieLists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
  } & MovieList_Key)[];
}

export interface MovieListItem_Key {
  movieListId: UUIDString;
  movieId: UUIDString;
  __typename?: 'MovieListItem_Key';
}

export interface MovieList_Key {
  id: UUIDString;
  __typename?: 'MovieList_Key';
}

export interface Movie_Key {
  id: UUIDString;
  __typename?: 'Movie_Key';
}

export interface Review_Key {
  id: UUIDString;
  __typename?: 'Review_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface Watch_Key {
  id: UUIDString;
  __typename?: 'Watch_Key';
}

interface CreateMovieListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMovieListVariables): MutationRef<CreateMovieListData, CreateMovieListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMovieListVariables): MutationRef<CreateMovieListData, CreateMovieListVariables>;
  operationName: string;
}
export const createMovieListRef: CreateMovieListRef;

export function createMovieList(vars: CreateMovieListVariables): MutationPromise<CreateMovieListData, CreateMovieListVariables>;
export function createMovieList(dc: DataConnect, vars: CreateMovieListVariables): MutationPromise<CreateMovieListData, CreateMovieListVariables>;

interface GetPublicMovieListsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPublicMovieListsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetPublicMovieListsData, undefined>;
  operationName: string;
}
export const getPublicMovieListsRef: GetPublicMovieListsRef;

export function getPublicMovieLists(): QueryPromise<GetPublicMovieListsData, undefined>;
export function getPublicMovieLists(dc: DataConnect): QueryPromise<GetPublicMovieListsData, undefined>;

interface AddMovieToListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
  operationName: string;
}
export const addMovieToListRef: AddMovieToListRef;

export function addMovieToList(vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;
export function addMovieToList(dc: DataConnect, vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;

interface GetMoviesInListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMoviesInListVariables): QueryRef<GetMoviesInListData, GetMoviesInListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMoviesInListVariables): QueryRef<GetMoviesInListData, GetMoviesInListVariables>;
  operationName: string;
}
export const getMoviesInListRef: GetMoviesInListRef;

export function getMoviesInList(vars: GetMoviesInListVariables): QueryPromise<GetMoviesInListData, GetMoviesInListVariables>;
export function getMoviesInList(dc: DataConnect, vars: GetMoviesInListVariables): QueryPromise<GetMoviesInListData, GetMoviesInListVariables>;

