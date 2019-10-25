<template>
    <div class="users container-fluid">
        <div class="card p-3">
            <div class="row">
                <div class="col-md-8">
                    <h2>Users</h2>
                </div>
                <div class="col-md-4">
                    <button @click="onAddUserClick()" class="btn btn-sm btn-primary float-right mb-1" :disabled="!client">Create User</button>
                    <div class="form-group">
                        <input v-model="filter" type="text" class="form-control form-control-sm" placeholder="Filter users">
                    </div>
                </div>
            </div>
            <UserList
                :users="users"
                @deleteUser="onDeleteUserClick($event)">
            </UserList>
        </div>
        <ModalWindow @modalActiveStateChange="onModalActiveStateChange($event)" ref="registerUserModal">
            <RegisterUser
                ref="userForm"
                :roles="roles"
                @saveUser="onSaveUser($event)">
            </RegisterUser>
        </ModalWindow>
    </div>
</template>

<script lang="ts">
'use strict';

import { Vue, Component, Ref } from 'vue-property-decorator';

import { userService }    from '@/services';
import { User }           from '@/models';
import { IRole, IClient } from '@/interfaces';
import UserList           from '@/components/UserList.vue';
import RegisterUser       from '@/components/RegisterUser.vue';
import ModalWindow        from '@/components/ModalWindow.vue';

@Component({
    components: {
        UserList,
        RegisterUser,
        ModalWindow
    }
})
export default class OrgUsers extends Vue {
    @Ref('registerUserModal') registerUserModal!: ModalWindow;
    @Ref('userForm')          userForm!:          RegisterUser;

    users:  User[]  = [];
    roles:  IRole[] = [];
    filter: string  = '';

    async created(): Promise<void>{
        if(!(this.client && this.user)){
            await this.$store.dispatch('loadUserToken');
        }

        this._loadUsers();
        this._loadRoles();
    }

    onAddUserClick(): void{
        this.userForm.clear();
        this.registerUserModal.open();
    }

    onSaveUser(user: User): void{
        if(!this.client) return;

        user.clientId = this.client.id;
        
        userService.createUser(user).then((newUser: User) => {
            this.users.push(newUser);
            this.registerUserModal.close();
        });
    }

    async onDeleteUserClick(user: User): Promise<void>{
        const deleted = await userService.deleteUser(user);

        this._loadUsers();
    }

    onModalActiveStateChange(active: boolean): void{
        
    }


    /*
        =======
        GETTERS
        =======
    */
    get client(): IClient{
        return this.$store.getters.client;
    }

    get user(): User{
        return this.$store.getters.user;
    }


    /*
        ===============
        PRIVATE METHODS
        ===============
    */
    private async _loadUsers(): Promise<User[]>{
        if(!(this.client && this.client.id)) return [];

        const users = await userService.getUsers(this.client.id);

        return this.users = users;
    }

    private async _loadRoles(): Promise<IRole[]>{
        const roles = await userService.getRoles();

        return this.roles = roles;
    }
}
</script>

<style scoped lang="sass">

</style>