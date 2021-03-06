<template>
    <div class="users container-fluid">
        <div class="card p-3">
            <div class="row">
                <div class="col-md-8">
                    <h2>Users</h2>
                </div>
                <div class="col-md-4">
                    <button @click="onAddUserClick()" class="btn btn-sm btn-primary float-right mb-1" :disabled="!client">Create User</button>
                    <div class="form-group mb-1">
                        <input v-model="filter" type="text" class="form-control form-control-sm" placeholder="Filter users">
                    </div>
                    <div class="form-group mb-1">
                        <div class="input-group mb-0">
                            <label class="text-right d-block w-100">
                                <input v-model="showAnonymous" type="checkbox" class="mr-2"> Show Anonymous Users
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <UserList
                :users="users"

                @editUser="onEditUserClick($event)"
                @deleteUser="onDeleteUserClick($event)">
            </UserList>
        </div>
        <ModalWindow ref="userModal">
            <UserForm
                ref="userForm"
                :user="selectedUser"
                :newUser="newUser"
                :roles="roles"

                @createUser="onCreateUser($event)"
                @updateUser="onUpdateUser($event)">
            </UserForm>
        </ModalWindow>
    </div>
</template>

<script lang="ts">
'use strict';

import { Vue, Component, Ref } from 'vue-property-decorator';
import { Route }               from 'vue-router';

import { userService, currentUserService } from '@/services';
import { SocketClient }                    from '@/socket-client';
import { Role, SocketMessageType }         from '@/constants';
import { User }                            from '@/models';
import { IRole, IClient }                  from '@/interfaces';
import { escapeRegex }                     from '@/utilities';

import UserList           from '@/components/user/UserList.vue';
import UserForm           from '@/components/user/UserForm.vue';
import ModalWindow        from '@/components/ui/ModalWindow.vue';
import { ISocketMessage } from '@/socket-client/interfaces';

@Component({
    components: {
        UserList,
        UserForm,
        ModalWindow
    },
    beforeRouteEnter(to: Route, from: Route, next: Function){
        if(!currentUserService.canViewUsers){ return next('/login') }
        
        next();
    }
})
export default class OrgUsers extends Vue {
    @Ref('userModal') userModal!: ModalWindow;
    @Ref('userForm')  userForm!:  UserForm;

    socket: SocketClient|null = null;

    selectedUser:  User|null = null;
    newUser:       boolean   = false;
    roles:         IRole[]   = [];
    filter:        string    = '';
    showAnonymous: boolean   = false;

    onAddUserClick(): void{
        this.newUser      = true;
        this.selectedUser = null;

        this.userForm.clear();
        this.userModal.open();
    }

    onEditUserClick(user: User): void{
        this.newUser      = false;
        this.selectedUser = user;

        this.userForm.init();
        this.userModal.open();
    }

    async onCreateUser(user: User): Promise<void>{
        if(!this.client) return;

        user.clientId = this.client.id;

        const newUser = await userService.createUser(user);

        this.userModal.close();
    }

    async onUpdateUser(user: User): Promise<void>{
        if(!this.client) return;

        user.clientId = this.client.id;

        const updatedUser = await userService.updateUser(user);

        this.userModal.close();
        this.userForm.clear();
    }

    async onDeleteUserClick(user: User): Promise<void>{
        if(!(this.client && this.client.id)) return;

        const deleted = await userService.deleteUser(user);
    }


    /*
        =======
        GETTERS
        =======
    */
    get client(): IClient|null{
        return this.$store.getters['client/client'];
    }

    get user(): User|null{
        return this.$store.getters['user/user'];
    }

    get users(): User[]{
        const users: User[] = this.$store.getters['user/users'];

        const exp = new RegExp(escapeRegex(this.filter), 'i');
        return users.filter((u: User) => {
            if(!this.showAnonymous && u.isAnonymous) return false;

            if(!this.filter) return true;
            
            if(exp.test(u.firstName))               return true;
            if(exp.test(u.lastName))                return true;
            if(exp.test(u.email))                   return true;
            if(exp.test(u.username))                return true;
            if(exp.test(<string>u.disabledComment)) return true;

            for(let role of u.roles){
                if(exp.test(`${ role }`)) return true;
            }

            if(exp.test(u.isDisabled ? 'yes' : 'no')) return true;


            return false;
        });
    }


    /*
        ===============
        LIFECYCLE HOOKS
        ===============
    */
    created(): void{
        this._loadUsers();
        this._loadRoles();

        if(this.client){
            this.socket = new SocketClient(`${ process.env.VUE_APP_WS_URL }/websocket`, `client::${ this.client.slug };users`, '', '');

            this.socket.subscribe((message: ISocketMessage) => {
                switch(message.type){
                    case SocketMessageType.USER_CREATED:
                        this.$store.commit('user/addUser', <User>message.data);
                        break;
                    case SocketMessageType.USER_UPDATED:
                        this.$store.commit('user/updateUser', <User>message.data);
                        break;
                    case SocketMessageType.USER_DELETED:
                        this.$store.commit('user/deleteUser', <User>message.data);
                        break;
                }
            });
        }
    }

    destroyed(): void{
        if(this.socket){
            this.socket.close();

            this.socket = null;
        }
    }


    /*
        ===============
        PRIVATE METHODS
        ===============
    */
    private async _loadUsers(): Promise<void>{
        if(!(this.client && this.client.id)) return;

        this.$store.dispatch('user/loadUsers');
    }

    private async _loadRoles(): Promise<IRole[]>{
        const roles = await userService.getRoles();

        return this.roles = roles;
    }
}
</script>

<style scoped lang="sass">

</style>