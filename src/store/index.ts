'use strict';

import Vue  from 'vue';
import Vuex from 'vuex';

import { userService, clientService, eventService }                       from '@/services';
import { IClient, IUserToken, IClientEventDescriptor, IWebSocketMessage } from '@/interfaces';
import { User, Event }                                                    from '@/models';

Vue.use(Vuex);

let socket: WebSocket|null = null;

const store = new Vuex.Store({
    state: {
        client: <IClient|null>   null,
        user:   <User|null>      null,
        socket: <WebSocket|null> socket,
        events: <Event[]>       [],
        event:  <Event|null>    null
    },
    getters: {
        events(state){ return state.events },
        event(state) { return state.event  },
        client(state){ return state.client },
        user(state)  { return state.user   },
        socket(state){ return state.socket }
    },
    mutations: {
        /*
            =============
            EVENT METHODS
            =============
        */
        setEvents(state, events: Event[]): void{
            state.events = events;
        },
        setEvent(state, event: Event): void{
            state.event = event;
        },
        addEvent(state, event: Event): void{
            if(!(state.events && Array.isArray(state.events))){
                state.events = [ event ];
                return;
            }

            state.events.push(event);
        },
        updateEvent(state, event: Event): void{
            if(!(state.events && Array.isArray(state.events))){
                state.events = [ event ];
                return;
            }

            const idx = state.events.findIndex(e => e.id === event.id);
            if(~idx){
                state.events.splice(idx, 1, event);
            }
        },
        deleteEvent(state, event: Event): void{
            if(!(state.events && Array.isArray(state.events))) return;

            const idx = state.events.findIndex(e => e.id === event.id);
            if(~idx){
                state.events.splice(idx, 1);
            }
        },

        /*
            ==============
            CLIENT METHODS
            ==============
        */
        setClient(state, client: IClient): void{
            state.client = client;
        },


        /*
            ============
            USER METHODS
            ============
        */
        setUser(state, user: User): void{
            state.user = user;
        },


        /*
            =================
            WEBSOCKET METHODS
            =================
        */
        setSocket(state, socket: WebSocket): void{
            state.socket = socket;
        }
    },
    actions: {
        /*
            =============
            EVENT METHODS
            =============
        */
        async loadEvents({ commit }, clientId: number): Promise<Event[]>{
            const events: Event[] = await eventService.getEvents(clientId);

            commit('setEvents', events);

            return events;
        },
        
        async loadEvent({ commit }, descriptor: IClientEventDescriptor): Promise<Event>{
            const event: Event = await eventService.getEvent(descriptor.clientId, descriptor.eventSlug);

            store.commit('setEvent', event);

            return event;
        },


        /*
            ==============
            CLIENT METHODS
            ==============
        */
        setClient({ commit }, client: IClient): void{
            commit('setClient', client);
        },


        /*
            ============
            USER METHDOS
            ============
        */
        setUser({ commit }, user: User): void{
            commit('setUser', user);
        },

        async loadUserToken({ commit, dispatch, getters }): Promise<void>{
            let token:     string|null = localStorage.getItem('token'),
                userToken: IUserToken;

            if(!token || token.toString() === 'undefined') return;

            try{
                userToken = JSON.parse(token);
            }
            catch(e){
                console.error('Failed parsing user token from storage');
                return;
            }

            const user = new User(userToken.data);

            commit('setUser', user);

            if(user.clientId && !getters.client){
                try{
                    const client = await clientService.getClient(user.clientId);

                    commit('setClient', client);

                    dispatch('openConnection');
                }
                catch(e){
                    console.error(`Failed to load client of ID ${ user.clientId }`);
                }
            }
        },

        saveUserToken({ commit }, token: string): void{
            localStorage.setItem('token', token);
        },


        /*
            =================
            WEBSOCKET METHODS
            =================
        */
        handleMessage({ commit }, message: string): void{
            let msg: IWebSocketMessage;
            try{
                msg = JSON.parse(message);
            }
            catch(e){
                console.error('Socket message not valid JSON');
                return;
            }

            switch(msg.type){
                case 'event-created':
                    const newEvent: Event = new Event(msg.data);

                    console.group(`$store.handleMessage`);
                    console.log('EVENT CREATED');
                    console.log(newEvent);
                    console.groupEnd();

                    commit('addEvent', newEvent);

                    break;
                case 'event-updated':
                    const updatedEvent: Event = new Event(msg.data);

                    console.group(`$store.handleMessage`);
                    console.log('EVENT UPDATED');
                    console.log(updatedEvent);
                    console.groupEnd();

                    commit('updateEvent', updatedEvent);

                    break;
                case 'event-deleted':
                    const deletedEvent: Event = new Event(msg.data);

                    console.group(`$store.handleMessage`);
                    console.log('EVENT DELETED');
                    console.log(deletedEvent);
                    console.groupEnd();

                    commit('deleteEvent', deletedEvent);

                    break;
                default:
                    console.group(`$store.handleMessage`);
                    console.log('UNKNOWN MESSAGE RECEIVED');
                    console.log(msg);
                    console.groupEnd();
            }
        },

        async openConnection(store): Promise<void>{
            if(!store.getters.client) return;
            if(!window.WebSocket)     return;

            let socket: WebSocket|null = store.getters.socket;
            
            if(!socket){
                socket = new WebSocket(`ws://localhost:8080/client/${ store.getters.client.slug }`);

                socket.addEventListener('open', (ev) => {
                    console.group('$store.openConnection')
                    console.log('Connection Opened');
                    console.log(ev);
                    console.groupEnd();
                });

                socket.addEventListener('message', (ev: MessageEvent) => {
                    store.dispatch('handleMessage', ev.data);
                });

                store.commit('setSocket', socket);
            }
        }
    }
});

/*
    ====================
    STORE INITIALIZATION
    ====================
*/
store.dispatch('loadUserToken');

export default store;