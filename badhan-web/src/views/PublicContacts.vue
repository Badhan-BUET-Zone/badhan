<template>
  <div>
    <PageTitle></PageTitle>
    <Container>
      <v-card-title>
        বাঁধন বুয়েট জোন
      </v-card-title>
      <v-card-text>
        <span class="title">
          বাঁধনের পক্ষ থেকে আপনাকে স্বাগতম। জরুরি রক্ত ডোনেশন পেতে নিম্নের বাঁধন সদস্যদের সাথে যোগাযোগ করুন।
        </span>
      </v-card-text>
      <transition name="slide-fade-down" mode="out-in">
      <v-card-text v-if="!publicContactsLoaderFlag" :key="'publicLoaded'">
        <ContainerOutlined v-for="(group,index) in publicContacts" :key="index">
          <v-card-title>
            <span v-if="group.bloodGroup!==-1"> {{ group.bloodGroup | getBloodGroupString }} রক্তের জন্য </span>
            <span v-else>যেকোনো নেগেটিভ (-) রক্তের জন্য</span>
          </v-card-title>
          <ContainerFlat v-for="contact in group.contacts" :key="contact.contactId">
            <v-card-title>
              {{ contact.name }}
            </v-card-title>
            <v-card-subtitle>
              Phone: +{{ contact.phone }}
            </v-card-subtitle>
            <Button
                :icon="'mdi-phone'"
                :text="'Direct Call'"
                :disabled="false"
                :color="'secondary'"
                :click="()=>{directCallClicked(contact.phone)}"
            ></Button>
            <Button v-if="getIsLoggedIn"
                :icon="'mdi-delete'"
                :text="'Delete'"
                :disabled="deleteButtonDisabledFlag[contact.contactId]"
                :color="'warning'"
                :click="()=>{deletePublicContactPrompt(contact.donorId, contact.contactId)}"
            ></Button>
          </ContainerFlat>
        </ContainerOutlined>
      </v-card-text>
      <v-card-text class="title" v-else :key="'publicLoading'">
        একটু অপেক্ষা করুন
        <LoadingMessage/>
      </v-card-text>
      </transition>
    </Container>
    <Container>
      <v-card-title>
        পেজটি শেয়ার করুন
      </v-card-title>
      <v-card-text>
        পেজটি শেয়ার করুন যেন সকলে দ্রুত ব্লাড ডোনেশন পেতে পারে
      </v-card-text>
      <v-card-actions>
        <Button
            :icon="'mdi-share'"
            :text="'Share'"
            :click="shareClicked"
            :color="'info'"
            :disabled="deleteLoaderFlag">
        </Button>
      </v-card-actions>
    </Container>
  </div>
</template>

<script>
import PageTitle from '../components/PageTitle'
import Container from '../components/Wrappers/Container'
import { mapMutations, mapGetters } from 'vuex'
import ContainerOutlined from '../components/Wrappers/ContainerOutlined'
import ContainerFlat from '../components/Wrappers/ContainerFlat'
import Button from '../components/UI Components/Button'
import { directCall } from '@/mixins/helpers'
import LoadingMessage from '@/components/LoadingMessage.vue'
import {DESIGNATIONS_INDEX } from '@/mixins/constants'
import { 
  handleDELETEPublicContacts, 
  handleGETPublicContacts 
} from '@/api'

export default {
  name: 'PublicContacts',
  components: { LoadingMessage, Button, ContainerFlat, ContainerOutlined, Container, PageTitle },
  data: () => {
    return {
      deleteLoaderFlag: false,
      publicContacts: [],
      publicContactsLoaderFlag: false,

      deleteButtonDisabledFlag: {},
      deletableDonorId: null,
      deletableContactId: null
    }
  },
  computed:{
    ...mapGetters(['getIsLoggedIn', 'getDesignation']),
    isDeletable(){
      return this.getDesignation == DESIGNATIONS_INDEX.SUPER_ADMIN && this.getIsLoggedIn
    }
  },
  methods: {
    ...mapMutations('messageBox', ['setMessage']),
    ...mapMutations('confirmationBox', ['setConfirmationMessage']),
    directCallClicked (phone) {
      directCall(phone)
    },
    shareClicked () {
      const linkText = 'জরুরি রক্ত ডোনেশন পেতে নিচের লিংকে ক্লিক করে বাঁধন বুয়েট জোনের সদস্যদের সাথে যোগাযোগ করুন।\n' +
          'https://badhan-buet.web.app/#/contacts'
      this.$copyText(linkText).then((_e) => {
        this.setMessage('লিংক কপি হয়েছে। প্রয়োজনমতো জায়গায় শেয়ার করুন।')
      })
    },
    async deleteConfirmed(){
      this.deleteLoaderFlag = true;
      this.deleteButtonDisabledFlag[this.deletableContactId] = true
      // this.bla()
      await handleDELETEPublicContacts({"donorId": this.deletableDonorId, "contactId": this.deletableContactId})
      this.deleteSelectedPublicContact(this.deletableContactId)
      this.deleteLoaderFlag = false;
    },
    processDeleteButtonDisabledFlags(){
      this.publicContacts.forEach(group=>{
        group.contacts.forEach(contact=>{
          this.deleteButtonDisabledFlag[contact.contactId] = false
        })
      })
    },
    deleteSelectedPublicContact(contactId){
      this.publicContacts.forEach(group=>{
        const index = group.contacts.findIndex(contact => contact.contactId === contactId);
        if (index !== -1) {
          group.contacts.splice(index, 1);   // delete 1 element at that index
        }
      })
    },
    deletePublicContactPrompt (donorId, contactId) {
      this.deletableContactId = contactId;
      this.deletableDonorId = donorId;
      this.setConfirmationMessage({
        confirmationMessage: 'Delete this public contact?',
        confirmationAction: this.deleteConfirmed
      })
    },
  },

  async mounted () {
    this.publicContactsLoaderFlag = true
    const response = await handleGETPublicContacts()
    this.publicContacts = response.data.publicContacts
    this.processDeleteButtonDisabledFlags()
    this.publicContactsLoaderFlag = false
  }
}
</script>

<style scoped>

</style>
