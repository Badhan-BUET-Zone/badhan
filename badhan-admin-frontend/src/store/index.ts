import { createStore, applyMiddleware } from 'redux';
import reducer from './reducer';
import thunk from "redux-thunk"
// ==============================|| REDUX - MAIN STORE ||============================== //

export interface Action {
    type: any;
}

export interface Dispatch {
    <A extends Action>(action: A): A;
}

export interface MiddlewareAPI<S> {
    dispatch: Dispatch;
    getState(): S;
}

export interface Middleware {
    <S>(api: MiddlewareAPI<S>): (next: Dispatch) => Dispatch;
}

export const classToObject: Middleware =
    (api: MiddlewareAPI<void>) =>
        (next: Dispatch) =>
            <A extends Action>(action: A) => {
                // Do stuff
                return next({...action});
            };

const store = createStore(reducer, applyMiddleware(thunk,classToObject));
const persister = 'Free';

export { store, persister };
