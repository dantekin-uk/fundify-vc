import { CreateMovieListData, CreateMovieListVariables, GetPublicMovieListsData, AddMovieToListData, AddMovieToListVariables, GetMoviesInListData, GetMoviesInListVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateMovieList(options?: useDataConnectMutationOptions<CreateMovieListData, FirebaseError, CreateMovieListVariables>): UseDataConnectMutationResult<CreateMovieListData, CreateMovieListVariables>;
export function useCreateMovieList(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMovieListData, FirebaseError, CreateMovieListVariables>): UseDataConnectMutationResult<CreateMovieListData, CreateMovieListVariables>;

export function useGetPublicMovieLists(options?: useDataConnectQueryOptions<GetPublicMovieListsData>): UseDataConnectQueryResult<GetPublicMovieListsData, undefined>;
export function useGetPublicMovieLists(dc: DataConnect, options?: useDataConnectQueryOptions<GetPublicMovieListsData>): UseDataConnectQueryResult<GetPublicMovieListsData, undefined>;

export function useAddMovieToList(options?: useDataConnectMutationOptions<AddMovieToListData, FirebaseError, AddMovieToListVariables>): UseDataConnectMutationResult<AddMovieToListData, AddMovieToListVariables>;
export function useAddMovieToList(dc: DataConnect, options?: useDataConnectMutationOptions<AddMovieToListData, FirebaseError, AddMovieToListVariables>): UseDataConnectMutationResult<AddMovieToListData, AddMovieToListVariables>;

export function useGetMoviesInList(vars: GetMoviesInListVariables, options?: useDataConnectQueryOptions<GetMoviesInListData>): UseDataConnectQueryResult<GetMoviesInListData, GetMoviesInListVariables>;
export function useGetMoviesInList(dc: DataConnect, vars: GetMoviesInListVariables, options?: useDataConnectQueryOptions<GetMoviesInListData>): UseDataConnectQueryResult<GetMoviesInListData, GetMoviesInListVariables>;
