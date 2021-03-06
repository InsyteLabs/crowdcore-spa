'use strict';

import { Module } from 'vuex';

import { eventService }         from '@/services';
import { ClientEvent, User }    from '@/models';
import { sortQuestionsByScore } from '@/utilities';

import {
    IEventQuestion, IEventMessage, IClientEventDescriptor, IEventQuestionStats
} from '@/interfaces';


export const eventModule: Module<any, any> = {
    state: {
        events:        <ClientEvent[]>    [],
        event:         <ClientEvent|null> null,
        questions:     <IEventQuestion[]> [],
        messages:      <IEventMessage[]>  [],
        submittedPass: <string|null>      null
    },

    getters: {
        events:        (state): ClientEvent[]    => state.events,
        event:         (state): ClientEvent|null => state.event,
        questions:     (state): IEventQuestion[] => state.questions || [],
        messages:      (state): IEventMessage[]  => state.messages  || [],
        submittedPass: (state): string           => state.submittedPass,

        user(state, getters, rootState, rootGetters): User|null{
            return rootGetters['user/user'];
        }
    },

    mutations: {
        updateSubmittedPass(state, pass: string): void{
            state.submittedPass = pass;
        },


        /*
            =============
            EVENT METHODS
            =============
        */
        setEvents(state, events: ClientEvent[]): void{
            state.events = events || [];
        },

        addEvent(state, event: ClientEvent): void{
            if(!(state.events && Array.isArray(state.events))){
                state.events = [ event ];
                return;
            }

            state.events.push(event);
        },

        setEvent(state, event: ClientEvent): void{
            if(!(event && event.id)) state.event = null;

            event.questions = event.questions || [];
            event.questions = event.questions.sort(sortQuestionsByScore);

            state.event = event;
        },

        updateEvent(state, event: ClientEvent): void{
            const events: ClientEvent[] = state.events;

            if(!events || !Array.isArray(events)){
                state.events = [ event ];
                return;
            }

            const idx = events.findIndex(e => e.id === event.id);
            if(~idx){
                events.splice(idx, 1, event);
            }

            // If the updated event is the same as the current event, update it
            if(state.event){
                if(state.event.id === event.id){
                    event.questions = state.event.questions;
                    event.messages  = state.event.messages;

                    state.event = event;
                }
            }
        },

        deleteEvent(state, event: ClientEvent): void{
            const events: ClientEvent[] = state.events;

            if(!(events && Array.isArray(events))) return;

            const idx = events.findIndex(e => e.id === event.id);
            if(~idx){
                events.splice(idx, 1);
            }
        },


        /*
            ======================
            EVENT QUESTION METHODS
            ======================
        */
        setQuestions(state, questions: IEventQuestion[]): void{
            state.questions = Array.isArray(questions) ? questions : [];
        },

        addQuestion(state, question: IEventQuestion): void{
            const { eventId }: { eventId: number } = question;

            if(state.event && state.event.id === eventId){
                state.questions.push(question);

                state.questions = state.questions.sort(sortQuestionsByScore);
            }
        },

        updateQuestion(state, question: IEventQuestion): void{
            if(state.event && (state.event.id === question.eventId)){
                const questions: IEventQuestion[] = state.questions;
                if(Array.isArray(questions)){
                    const idx = questions.findIndex(q => q.id === question.id);
                    if(~idx){
                        questions.splice(idx, 1, question);
                    }
                }
            }
        },

        deleteQuestion(state, question: IEventQuestion): void{
            const { eventId }: { eventId: number } = question;

            if(state.event && state.event.id === eventId){
                const questions: IEventQuestion[] = state.questions;

                const idx = questions.findIndex(q => q.id === question.id);
                if(~idx){
                    questions.splice(idx, 1);
                }
            }
        },

        
        /*
            ==================
            EVENT CHAT METHODS
            ==================
        */
        setMessages(state, messages: IEventMessage[]): void{
            state.messages = Array.isArray(messages) ? messages : [];
        },

        addMessage(state, message: IEventMessage): void{
            const { eventId }: { eventId: number } = message;

            if(state.event && state.event.id === eventId){
                const messages: IEventMessage[] = state.messages;

                messages.push(message);
            }

        },

        updateMessage(state, message: IEventMessage): void{
            const { eventId }: { eventId: number } = message;

            if(state.event && state.event.id === eventId){
                const messages: IEventMessage[] = state.messages;

                const idx = messages.findIndex(m => m.id === message.id);
                if(~idx){
                    messages.splice(idx, 1, message);
                }
            }
        },

        deleteMessage(state, message: IEventMessage): void{
            const { eventId }: { eventId: number } = message;

            if(state.event && state.event.id === eventId){
                const messages: IEventMessage[] = state.messages;

                const idx = messages.findIndex(m => m.id === message.id);
                if(~idx){
                    messages.splice(idx, 1);
                }
            }
        },
    },


    actions: {
        /*
            =============
            EVENT METHODS
            =============
        */
        async loadEvents({ commit }, clientId: number): Promise<ClientEvent[]>{
            const events: ClientEvent[] = await eventService.getEvents();

            commit('setEvents', events);

            return events;
        },
        
        async loadEvent({ commit }, descriptor: IClientEventDescriptor): Promise<ClientEvent>{
            const event: ClientEvent = await eventService.getEvent(descriptor.eventSlug);

            commit('setEvent', event);

            return event;
        },


        /*
            ======================
            EVENT QUESTION METHODS
            ======================
        */
        async loadQuestions({ commit, state }): Promise<IEventQuestion[]>{
            const event: ClientEvent = state.event;

            if(!(event && event.id)){
                commit('setQuestions', []);

                return [];
            }

            let questions: IEventQuestion[] = await eventService.getQuestions(event.id);

            questions = questions.sort(sortQuestionsByScore);

            commit('setQuestions', questions);

            return questions || [];
        },

        addQuestion({ commit, getters }, question: IEventQuestion): void{
            if(question && question.stats && getters.user){
                question.stats.voteRequester = getters.user.id;
                question.stats.userVote      = 0;
            }
            commit('addQuestion', question);
        },

        updateQuestion({ commit, getters, state }, question: IEventQuestion): void{

            const { eventId }: { eventId: number } = question;

            if(getters.event && (getters.event.id === eventId) && getters.user){
                const questions: IEventQuestion[] = getters.questions;

                const idx = questions.findIndex(q => q.id === question.id);
                if(~idx){
                    const existing      = questions[idx],
                          existingStats = <IEventQuestionStats>existing.stats;
                    
                    const newStats = <IEventQuestionStats>question.stats;
                    
                    if(newStats.voteRequester !== existingStats.voteRequester){
                        newStats.userVote      = existingStats.userVote;
                        newStats.voteRequester = getters.user.id;
                    }

                    questions.splice(idx, 1, question);

                    state.questions = state.questions.sort(sortQuestionsByScore);
                }
            }
            
            commit('updateQuestion', question);
        },


        /*
            =====================
            EVENT MESSAGE METHODS
            =====================
        */
        async loadMessages({ commit, state }): Promise<IEventMessage[]>{
            const event: ClientEvent = state.event;

            if(!(event && event.id)){
                commit('setMessages', []);

                return [];
            }

            const messages: IEventMessage[] = await eventService.getMessages(event.id);

            commit('setMessages', messages);

            return messages || [];
        }
    }
}