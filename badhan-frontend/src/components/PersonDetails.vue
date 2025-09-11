<template>
  <div>
    <transition name="slide-fade-down-snapout" mode="out-in">
      <LoadingMessage v-if="donorLoaderFlag" :key="'donorLoading'"/>
      <Container v-else-if="donorErrorHappened" :key="'donorError'">
        <PageTitle></PageTitle>
        <v-card class="mx-auto mt-2" max-width="700">
          <v-card-title>No donor found</v-card-title>
        </v-card>
      </Container>

      <Container v-else :key="'donorLoaded'">
        <v-card-title>{{ name }}
          <v-menu
            v-model="activeDonorMenu"
            :close-on-content-click="false"
            :nudge-width="200"
            offset-x
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn id="personDetailsActiveDonorButtonId" data-cy="personDetailsActiveDonorButtonId"
                color="primary"
                icon
                v-bind="attrs"
                v-on="on"
              >
                <v-icon v-if="markedBy">
                  mdi-bookmark
                </v-icon>
                <v-icon v-else>
                  mdi-bookmark-off-outline
                </v-icon>
              </v-btn>
            </template>
            <v-card rounded>
              <v-card-title>Active Donor</v-card-title>
              <v-card-text>
                <span v-if="markedBy">Marked by: {{ markedBy }}</span>
                <v-switch
                  id="personDetailsActiveDonorSwitchId"
                  data-cy="personDetailsActiveDonorSwitchId"
                  :disabled="activeDonorLoader"
                  v-model="markedAsActiveDonor"
                  @change="markAsActiveDonorHandler"
                  label="Active donor"
                  dense>
                </v-switch>
                <Button :icon="'mdi-close'" :text="'Close'" :click="()=>{this.activeDonorMenu=false;}"
                        :color="'secondary'"></Button>
              </v-card-text>
              <v-card-actions>
              </v-card-actions>
            </v-card>
          </v-menu>
          <v-tooltip
            v-model="showTooltip"
            top
          >
            <template v-slot:activator="{}">
              <v-btn color="secondary" icon @click="shareClicked">
                <v-icon>
                  mdi-share
                </v-icon>
              </v-btn>
            </template>
            <span>Donor copied to clipboard</span>
          </v-tooltip>

        </v-card-title>
        <v-card-subtitle>Donor Profile</v-card-subtitle>
        <v-card-text class="mb-5">
          <v-chip color="secondary" class="mr-1 mb-1">
            <span v-if="designation === 0">Donor</span>
            <span v-else-if="designation === 1">Volunteer</span>
            <span v-else-if="designation === 2">Hall Admin</span>
            <span v-else>Super Admin</span>
          </v-chip>
          <v-chip class="mr-1 mb-1" color="secondary">{{ donationList.length }} Blood Donations</v-chip>
          <v-chip class="mr-1 mb-1" color="secondary">{{ plateletDonationList.length }} Platelet Donations</v-chip>
          <!-- Availability chips logic:
               If both types are currently unavailable (have remaining days), show only the one with the larger remaining days.
               If only one is unavailable, show that one.
               If both are available, show both green chips. -->
          <template v-if="furthestPendingType === 'blood'">
            <v-chip class="mr-1 mb-1" color="warning">{{ availableIn }} Days remaining</v-chip>
          </template>
          <template v-else-if="furthestPendingType === 'platelet'">
            <v-chip class="mr-1 mb-1" color="warning">{{ plateletAvailableIn }} Days remaining</v-chip>
          </template>
          <template v-else>
            <v-chip class="mr-1 mb-1" dark color="green">Available for Donation</v-chip>
          </template>
          <br>
          <div class="row" v-if="!$store.getters['getLoadingFlag']">
            <div class="col-lg-6 col-md-12 col-sm-12" id="firstColumn">
              <ContainerOutlined>
                <v-card-title>
                  <v-btn rounded @click="personDetailCollapseFlag = !personDetailCollapseFlag">
                    Person Details
                  </v-btn>
                  <HelpTooltip>
                    <div style="max-width: 200px">
                      You can only edit donors of your own hall, editing donors of other halls is restricted.<br>You
                      can still view details, update comments and manage donations of a donor of other halls if that
                      donor is marked as public data.
                    </div>
                  </HelpTooltip>
                </v-card-title>
                <transition name="slide-fade-down-snapout" mode="out-in">
                  <v-card-text v-if="personDetailCollapseFlag">
                    <div>
                      <TextField id="donorDetailsNameTextBoxId" data-cy="donorDetailsNameTextBoxId" label="Name" v-model="name" :hint="''"
                                    :disabled="!isDetailsEditable" @blur="$v.name.$touch()"
                                    :error-messages="nameErrors"></TextField>
                      <TextField id="donorDetailsPhoneTextBoxId" data-cy="donorDetailsPhoneTextBoxId" label="Phone" v-model="phone" :hint="''"
                                    :disabled="!isDetailsEditable" @blur="$v.phone.$touch()"
                                    :error-messages="phoneErrors"></TextField>
                      <TextField
                        id="donorDetailsEmailTextBoxId"
                        data-cy="donorDetailsEmailTextBoxId"
                        :hint="(designation!==0 && !$isMe(id))?'You cannot edit this email':'Password Recovery Email'"
                        :persistent-hint="(designation!==0 && !$isMe(id))" :label="'Email'"
                        v-model="email"
                        :disabled="!isDetailsEditable || (designation!==0 && !$isMe(id)) "
                        @blur="$v.email.$touch()"
                        :error-messages="emailErrors">
                      </TextField>
                      <span id="donorDetailsBloodGroupSpanId">
                      <Selector id="donorDetailsBloodGroupDropDownId" data-cy="donorDetailsBloodGroupDropDownId" v-model="bloodGroup" :items="bloodGroups" label="Blood Group"
                                :disabled="!isDetailsEditable" />
                      </span>
                      <TextField id="donorDetailsStudentIdTextBoxId" data-cy="donorDetailsStudentIdTextBoxId" label="Student ID: " v-model="studentId" :hint="''"
                                    :disabled="!isDetailsEditable" @blur="$v.studentId.$touch()"
                                    :error-messages="studentIdErrors"></TextField>
                      <TextField id="donorDetailsRoomTextBoxId" data-cy="donorDetailsRoomTextBoxId" label="Room" v-model="room" :hint="''"
                                    :disabled="!isDetailsEditable"></TextField>
                      <TextField id="donorDetailsAddressTextBoxId" data-cy="donorDetailsAddressTextBoxId" label="Address" v-model="address" :hint="''"
                                    :disabled="!isDetailsEditable"></TextField>
                      <span id="donorDetailsHallDropDownSpan">
                      <Selector id="donorDetailsHallDropDownId" data-cy="donorDetailsHallDropDownId" v-model="hall" :items="availableHalls" label="Hall"
                                :disabled="!isDetailsEditable || designation === 2 || designation === 1" />
                      </span>
                      <v-checkbox id="donorDetailsPublicDataCheckboxId" data-cy="donorDetailsPublicDataCheckboxId" :disabled="!isDetailsEditable || halls.indexOf(hall)===8" v-model="availableToAll"
                                  dense
                                  label="Public Data"></v-checkbox>

                      <div v-if="$store.getters['getDesignation'] > designation || $isMe(id)">
                        <v-btn id="donorDetailsSaveButtonId" data-cy="donorDetailsSaveButtonId" color="primary" rounded class="white--text ml-2" small
                               :disabled="detailsLoaderFlag || !isDetailsEditable || $v.name.$error || $v.phone.$error || $v.studentId.$error || $v.email.$error"
                               @click="saveDetailsClicked()">
                          <v-icon left>
                            mdi-content-save
                          </v-icon>
                          Save
                        </v-btn>
                      </div>
                    </div>
                    <v-textarea id="donorDetailsCommentTextBoxId" data-cy="donorDetailsCommentTextBoxId" rounded dense class="mt-5" name="comment" outlined v-model="comment"
                                label="Comment" auto-grow
                                :disabled="commentLoaderFlag" :rows="1"
                                :messages="'Last Updated: '+ (commentTime==0?'Unknown':new Date(commentTime).toDateString()+' on '+new Date(commentTime).toLocaleTimeString())">
                    </v-textarea>

                    <v-btn id="donorDetailsCommentSaveButtonId" data-cy="donorDetailsCommentSaveButtonId" color="primary" rounded small
                           :disabled="commentLoaderFlag"
                           @click="saveCommentClicked()">
                      <v-icon left>
                        mdi-content-save
                      </v-icon>
                      Save Comment
                    </v-btn>
                  </v-card-text>
                </transition>
              </ContainerOutlined>

              

              <ContainerOutlined v-if="$store.getters['getDesignation'] >= designation || $isMe(id)">
                <v-card-title>
                  <v-btn rounded
                         id="profileSettingsId"
                         data-cy="profileSettingsButton"
                         @click="settingsCollapseFlag = !settingsCollapseFlag">
                    Settings
                  </v-btn>
                </v-card-title>
                <transition name="slide-fade-down-snapout" mode="out-in">
                  <v-card-text v-if="settingsCollapseFlag">
                    <transition-group name="slide-fade-down" mode="out-in">
                      <v-btn id="promoteToVolunteerButtonId" data-cy="promoteToVolunteerButtonId" key="promoteToVolunteer"
                             small
                             class="ma-1"
                             color="primary"
                             :disabled="promoteFlag"
                             @click="promoteClicked"
                             rounded v-if="isAllowedToPromoteToVolunteer">
                        <v-icon left>mdi-arrow-up</v-icon>
                        Promote To Volunteer
                      </v-btn>
                      <v-btn key="passwordRecoveryLink" small
                             :disabled="passwordRecoveryFlag"
                             @click="createPasswordRecoveryLink" class="ma-1" color="primary" rounded
                             v-if="isPasswordLinkResetable">
                        <v-icon left>mdi-lock-reset</v-icon>
                        Password Recovery Link
                      </v-btn>

                      <div key="linkGenerated" class="mt-2" v-if="passwordRecoveryLink">
                        <v-row no-gutters>
                          <v-col cols="9">
                            <v-text-field rounded dense outlined disabled
                                          v-model="passwordRecoveryLink" label="Recovery link"></v-text-field>
                          </v-col>
                          <v-col cols="3">
                            <v-tooltip
                              v-model="passwordRecoveryTooltip"
                              top
                            >
                              <template v-slot:activator="{ attrs }">
                                <v-btn class="ml-1" @click="passwordRecoveryLinkCopyClicked" v-bind="attrs" rounded
                                       color="secondary">
                                  <v-icon>
                                    mdi-clipboard-outline
                                  </v-icon>
                                </v-btn>
                              </template>
                              <span style="max-width: 300px">Password recovery link copied to clipboard.</span>
                            </v-tooltip>
                          </v-col>
                        </v-row>
                      </div>

                      <v-btn id="demoteToDonorButtonId" data-cy="demoteToDonorButtonId" key="demoteToDonor" small class="ma-1" color="warning" rounded
                             :disabled="promoteFlag"
                             v-if="isAllowedToDemoteToDonor" @click="demoteClicked">
                        <v-icon left>mdi-arrow-down</v-icon>
                        Demote To Donor
                      </v-btn>

                      <div key="passwordChange" v-if="$isMe(id)">
                        <TextField id="newPasswordFieldId" data-cy="newPasswordFieldId" :append-icon="newPasswordFlag ? 'mdi-eye' : 'mdi-eye-off'"
                                      :type="newPasswordFlag ? 'text' : 'password'"
                                      label="New Password" v-model="newPassword" :hint="''"
                                      class="input-group--focused"
                                      @click:append="newPasswordFlag = !newPasswordFlag"
                                      :disabled="!isDetailsEditable"
                                      @blur="$v.newPassword.$touch()"
                                      :error-messages="newPasswordErrors"></TextField>
                        <TextField id="confirmPasswordFieldId" data-cy="confirmPasswordFieldId" :append-icon="confirmPasswordFlag ? 'mdi-eye' : 'mdi-eye-off'"
                                      :type="confirmPasswordFlag ? 'text' : 'password'"
                                      label="Confirm Password" v-model="confirmPassword" class="input-group--focused" :hint="''"
                                      @click:append="confirmPasswordFlag = !confirmPasswordFlag"
                                      :disabled="!isDetailsEditable"
                                      @blur="$v.confirmPassword.$touch()"
                                      :error-messages="confirmPasswordErrors"></TextField>
                        <v-btn small class="ma-1" color="secondary" style="text-decoration: none" to="/home" rounded>
                          <v-icon left>mdi-window-close</v-icon>
                          Cancel
                        </v-btn>
                        <v-btn id="passwordChangeConfirmedId" data-cy="passwordChangeConfirmedId" class="ma-1" color="primary" rounded small
                               :disabled="$v.newPassword.$error || $v.confirmPassword.$error || passwordChangeFlag"
                               @click="savePasswordClicked"
                        >
                          <v-icon left>mdi-content-save</v-icon>
                          Save
                        </v-btn>
                      </div>
                      <v-btn id="personDetailsDeleteButtonId" data-cy="personDetailsDeleteButtonId" key="deletePerson" small class="ma-1" v-if="isDeletable" @click="deleteDonorPrompt"
                             rounded
                             color="warning"
                             :disabled="deleteDonorFlag">
                        <v-icon left dark>mdi-delete</v-icon>
                        Delete this person
                      </v-btn>
                      <v-btn id="promoteToHallAdminButtonId" data-cy="promoteToHallAdminButtonId" key="promoteToHallAdmin" small class="ma-1" rounded color="primary"
                             v-if="$store.getters['getDesignation']===3 && designation===1"
                             :disabled="changeAdminLoaderFlag || !isDetailsEditable"
                             @click="changeHallAdminClicked()">
                        <v-icon left dark>mdi-arrow-up</v-icon>
                        Promote to Hall admin
                      </v-btn>
                    </transition-group>
                  </v-card-text>
                </transition>
              </ContainerOutlined>

            </div>
            <div class="col-lg-6 col-md-12 col-md-12" style="height: fit-content">

              <ContainerOutlined>
                <v-card-title>
                  Add Donation
                </v-card-title>
                <v-card-text>
                  <!--              NEW DONATION SECTION-->
                  <v-radio-group v-model="newDonationType" row>
                    <v-radio label="Blood" value="Blood"></v-radio>
                    <v-radio label="Platelet" value="Platelet"></v-radio>
                  </v-radio-group>
                  <div>
                    <DatePicker
                      v-model="newDonationDate"
                      label="Add a donation date"
                      text-field-id="personDetailsNewDonationTextboxId"
                      :picker-id="'personDetailsNewDonationDatePickerId'"
                      :ok-button-id="'personDetailsNewDonationDatePickerOkButtonId'"
                    />
                  </div>
                  <v-btn
                    id="personDetailsNewDonationOkButtonId"
                    color="primary"
                    rounded
                    small
                    style="width: 100%"
                    @click="donateClicked"
                    :disabled="newDonationLoader || newDonationDate.length === 0"
                  >
                    <v-icon left>
                      mdi-check
                    </v-icon>
                    Done
                  </v-btn>
                  <!--              NEW DONATION SECTION END-->
                </v-card-text>
              </ContainerOutlined>

              <ContainerOutlined>
                <v-card-title>
                  Blood Donations
                </v-card-title>
                <v-card-text>
                  <p class="mt-2 h6 font-weight-bold">Last Blood Donation:</p>
                  <template v-if="lastDonation !== 0">
                    <p>{{ lastDonation }}</p>
                    <p class="h6 font-weight-bold">Blood Donation History:</p>
                    <Button
                      :id="`personDetailsDonationHistoryButtonId`"
                      :icon="donationsCollapseFlag?'mdi-arrow-down':'mdi-arrow-up'"
                      :text="donationsCollapseFlag?'Show '+donationList.length+' donations':'Hide donations'"
                      :click="()=>{this.donationsCollapseFlag=!this.donationsCollapseFlag}"
                      :color="'info'"></Button>
                    <transition name="slide-fade-down">
                    <span v-if="!donationsCollapseFlag">
                      <transition-group name="slide-fade-down" tag="p">
                          <DonationCard
                            v-for="date in donationList"
                            :key="date._id"
                            :date-object="date"
                            :delete-donation="deleteDonationClicked">
                          </DonationCard>
                      </transition-group>
                      <br/>
                    <p v-if="donationList.length===0">
                      No donations found
                    </p>
                    </span>
                    </transition>
                  </template>
                  <span v-else>(Unknown)</span>
                </v-card-text>
              </ContainerOutlined>

              <ContainerOutlined>
                <v-card-title>
                  <span data-cy="personDetailsPlateletDonationsTitle">Platelet Donations</span>
                </v-card-title>
                <v-card-text>
                  <p class="mt-2 h6 font-weight-bold">Last Platelet Donation:</p>
                  <template v-if="lastPlateletDonation !== 0">
                    <p>{{ lastPlateletDonation }}</p>
                    <p class="h6 font-weight-bold">Platelet Donation History:</p>
                    <Button
                      :id="`personDetailsPlateletDonationHistoryButtonId`"
                      :icon="plateletDonationsCollapseFlag?'mdi-arrow-down':'mdi-arrow-up'"
                      :text="plateletDonationsCollapseFlag?'Show '+plateletDonationList.length+' donations':'Hide donations'"
                      :click="()=>{this.plateletDonationsCollapseFlag=!this.plateletDonationsCollapseFlag}"
                      :color="'info'"></Button>
                    <transition name="slide-fade-down">
                    <span v-if="!plateletDonationsCollapseFlag">
                      <transition-group name="slide-fade-down" tag="p">
                          <DonationCard
                            v-for="date in plateletDonationList"
                            :key="date._id"
                            :date-object="date"
                            :delete-donation="deletePlateletDonationClicked">
                          </DonationCard>
                      </transition-group>
                      <br/>
                    <p v-if="plateletDonationList.length===0">
                      No donations found
                    </p>
                    </span>
                    </transition>
                  </template>
                  <span v-else>(Unknown)</span>
                </v-card-text>
              </ContainerOutlined>

              <ContainerOutlined>
                <v-card-title>Call History</v-card-title>
                <v-card-text>
                  <p class="h6 font-weight-bold">List of calls made to this donor:</p>
                  <Button
                    id="personDetailsCallRecordButtonId"
                    :icon="callRecordsCollapseFlag?'mdi-arrow-down':'mdi-arrow-up'"
                    :text="callRecordsCollapseFlag?'Show '+callRecords.length+' calls':'Hide calls'"
                    :click="()=>{this.callRecordsCollapseFlag=!this.callRecordsCollapseFlag}"
                    :color="'info'">
                  </Button>
                </v-card-text>
                <transition name="slide-fade-down">
                  <v-card-text v-if="!callRecordsCollapseFlag">
                    <p v-if="callRecords.length===0">No call history</p>
                    <transition-group name="slide-fade-down" tag="p">
                      <CallRecordCard v-for="callRecord in callRecords" :key="callRecord._id" :call-record="callRecord"
                                      :deleted="callRecordDeleted">
                      </CallRecordCard>
                    </transition-group>
                  </v-card-text>
                </transition>
              </ContainerOutlined>

              <ContainerOutlined v-if="$store.getters['getDesignation'] === 3">
                <v-card-title>
                  Public Contacts
                </v-card-title>
                <v-card-text>
                  <p class="mt-2 h6 font-weight-bold">Existing Public Contacts:</p>
                  <p v-if="publicContacts.length===0">This contact is not published for the public to see</p>
                  <transition-group name="slide-fade-down" tag="p">
                    <v-btn :id="`publicContactButtonId_${publicContact._id}`" rounded :disabled="deletePublicContactLoader" class="ma-1" v-for="publicContact in publicContacts" :key="publicContact._id" color="secondary" x-small @click="()=>{deletePublicContactClicked(publicContact._id)}">
                      {{ publicContact.bloodGroup | getBloodGroupString }}
                      <v-icon right>
                        mdi-delete
                      </v-icon>
                    </v-btn>
                  </transition-group>
                  <transition name="slide-fade-down" mode="out-in">
                    <v-progress-linear indeterminate v-if="deletePublicContactLoader"></v-progress-linear>
                  </transition>
                  <p class="mt-4 h6 font-weight-bold">New Public Contact</p>
                  <Selector
                    id="personDetailsPublicContactSelectId"
                    data-cy="personDetailsPublicContactSelectId"
                    v-model="selectedNewPublicContact"
                    :items="publicContactBloodGroupNames"
                    label="Blood Group"
                  />

                  <Button
                    id="profileDetailsPublicContactButtonId"
                    data-cy="profileDetailsPublicContactButtonId"
                    :click="publishToPublicContactClicked"
                    :disabled="newPublicContactLoader || !selectedNewPublicContact"
                    :color="'primary'" :text="'Publish'" :icon="'mdi-content-save'">
                  </Button>
                </v-card-text>
              </ContainerOutlined>
            </div>
          </div>
        </v-card-text>
      </Container>
    </transition>
  </div>
</template>

<script>
import { halls, bloodGroups } from '@/mixins/constants'
import { required, minLength, maxLength, numeric, sameAs } from 'vuelidate/lib/validators'
import CallRecordCard from '@/views/Home/components/CallRecordCard'
import HelpTooltip from '@/components/UI Components/HelpTooltip'
import PageTitle from '@/components/PageTitle'
import Container from '@/components/Container/Container'
import ContainerOutlined from '@/components/Container/ContainerOutlined'
import {
  handleDELETEActiveDonors, handlePOSTActiveDonors, isGuestEnabled,
  handlePATCHDonorsDesignation,
  handlePATCHUsersPassword,
  handleDELETEDonors,
  handlePOSTDonorsPasswordRequest,
  handleDELETEPublicContacts,
  handlePOSTPublicContacts, handlePOSTDonations,
  handlePATCHDonorsComment,
  handlePATCHDonors, handlePOSTCallRecord, handleGETDonors,
  handleDELETEDonations, handlePOSTPlateletDonations, handleDELETEPlateletDonations,
  handlePATCHAdmins
} from '@/api'
import DonationCard from '@/views/Home/components/DonationCard'
import Button from '@/components/UI Components/Button'
import { directCall, fixBackSlash } from '@/mixins/helpers'
import { environmentService } from '@/mixins/environment'
import LoadingMessage from '@/components/LoadingMessage.vue'
import DatePicker from '@/components/UI Components/DatePicker.vue'
import TextField from '@/components/UI Components/TextField.vue'
import Selector from '@/components/UI Components/Selector.vue'

export default {
  name: 'PersonDetails',
  props: ['donorId'],
  components: {
    LoadingMessage,
    Button,
    DonationCard,
    ContainerOutlined,
    Container,
    CallRecordCard,
    HelpTooltip,
    PageTitle,
    DatePicker,
    Selector,
    TextField
  },
  data: function () {
    return {
      // form fields
      fav: true,
      activeDonorMenu: false,
      message: false,
      hints: true,

      id: null,
      name: '',
      oldPhone: '',
      phone: '',
      studentId: '',
      email: '',
      bloodGroup: '',
      availableIn: '',
      plateletAvailableIn: '',
      designation: '',
      hall: '',
      room: '',
      address: '',
      lastDonation: '',
      commentTime: 0,

      dateToBeDeleted: '',

      halls,
      bloodGroups,
      showDetails: false,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      comment: '',
      availableToAll: false,

      // history flag
      showHistory: false,

      // spinner controller flags

      // vuetify modal
      dialog: false,

      // person detail collapse and settings collapse
      personDetailCollapseFlag: false,
      settingsCollapseFlag: false,

      // password field flag
      confirmPasswordFlag: false,
      newPasswordFlag: false,

      newDonationDate: '',
      newDonationType: 'Blood',

      dataLoaded: false,
      showTooltip: false,

      donorErrorHappened: false,
      promoteFlag: false,
      passwordChangeFlag: false,
      deleteDonorFlag: false,
      passwordRecoveryFlag: false,
      passwordRecoveryTooltip: false,
      passwordRecoveryLink: null,

      deleteDonorDialogFlag: false,

      publicContacts: [],
      publicContactBloodGroupNames: ['A+', 'B+', 'O+', 'AB+', 'All Negative'],
      selectedNewPublicContact: '',
      newPublicContactLoader: false,
      deletePublicContactLoader: false,

      callRecords: [],
      callRecordsCollapseFlag: true,
      donationsCollapseFlag: true,
      plateletDonationsCollapseFlag: true,

      markedAsActiveDonor: false,
      markedBy: null,
      activeDonorLoader: false,
      donationList: [],
      newDonationLoader: false,
      plateletDonationList: [],
      lastPlateletDonation: '',

      commentLoaderFlag: false,

      detailsLoaderFlag: false,

      donorLoaderFlag: false,

      profile: null,

      changeAdminLoaderFlag: false
    }
  },
  created () {
    const now = new Date()
    this.today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().substr(0, 10)
  },
  validations: {
    phone: {
      required,
      minLength: minLength(11),
      maxLength: maxLength(11),
      numeric
    },
    studentId: {
      minLength: minLength(7),
      maxLength: maxLength(7),
      numeric,
      required
    },
    email: {
      validEmail (email) {
        if (email === '') return true
        const emailRegex = /^([\w-.]+@([\w-]+\.)+[\w-]{2,4})?$/
        return emailRegex.test(email)
      }
    },
    name: {
      required
    },
    newPassword: {
      required,
      minLength: minLength(6)
    },
    confirmPassword: {
      sameAs: sameAs('newPassword')
    }
  },
  watch: {
    dialog (to, _from) {
      if (to === false) {
        this.$router.push('/home')
      }
    }
  },
  computed: {
    isAllowedToPromoteToVolunteer () {
      return this.designation === 0 && halls.indexOf(this.hall) <= 6 && (this.$store.getters['getDesignation'] === 3 || (this.$store.getters['getHall'] === halls.indexOf(this.hall) && this.$store.getters['getDesignation'] === 2))
    },
    isAllowedToDemoteToDonor () {
      return this.designation === 1 && halls.indexOf(this.hall) <= 6 && (this.$store.getters['getDesignation'] === 3 || (this.$store.getters['getHall'] === halls.indexOf(this.hall) && this.$store.getters['getDesignation'] === 2))
    },
    isPasswordLinkResetable () {
      return !isGuestEnabled() && !this.$isMe(this.id) && this.designation !== 0 && (this.$store.getters['getDesignation'] === 3 || (this.$store.getters['getHall'] === halls.indexOf(this.hall) && this.$store.getters['getDesignation'] > this.designation))
    },
    isDeletable () {
      return !this.$isMe(this.id) && this.designation <= 1 && (this.$store.getters['getDesignation'] === 3 || halls.indexOf(this.hall) === 8 || (this.$store.getters['getDesignation'] > this.designation && this.$store.getters['getHall'] === halls.indexOf(this.hall)))
    },

    isDetailsEditable () {
      return this.$store.getters['getDesignation'] === 3 || this.$isMe(this.id) || (this.$store.getters['getHall'] === halls.indexOf(this.hall) && this.$store.getters['getDesignation'] > this.designation) || halls.indexOf(this.hall) === 8
    },

    phoneErrors () {
      const errors = []
      if (!this.$v.phone.$dirty) return errors
      !this.$v.phone.minLength && errors.push('Phone must be at least 11 digits long')
      !this.$v.phone.maxLength && errors.push('Phone must be at least 11 digits long')
      !this.$v.phone.numeric && errors.push('Phone must be numeric')
      !this.$v.phone.required && errors.push('Phone is required.')
      return errors
    },
    studentIdErrors () {
      const errors = []
      if (!this.$v.studentId.$dirty) return errors
      !this.$v.studentId.minLength && errors.push('Student ID must be of 7 digits')
      !this.$v.studentId.maxLength && errors.push('Student ID must be of 7 digits')
      !this.$v.studentId.numeric && errors.push('Student ID must be numeric')
      !this.$v.studentId.required && errors.push('Student ID is required')
      return errors
    },
    emailErrors () {
      const errors = []
      if (!this.$v.email.$dirty) return errors
      !this.$v.email.validEmail && errors.push('Email not valid')
      return errors
    },
    nameErrors () {
      const errors = []
      if (!this.$v.name.$dirty) return errors
      !this.$v.name.required && errors.push('Name is required')
      return errors
    },
    newPasswordErrors () {
      const errors = []
      if (!this.$v.newPassword.$dirty) return errors
      !this.$v.newPassword.required && errors.push('Specify a password')
      !this.$v.newPassword.minLength && errors.push('Password must be at least 6 characters long')
      return errors
    },
    confirmPasswordErrors () {
      const errors = []
      if (!this.$v.confirmPassword.$dirty) return errors
      !this.$v.confirmPassword.sameAs && errors.push('Password does not match')
      return errors
    },

    availableHalls () {
      if (this.$store.getters['getDesignation'] !== null) {
        if (this.$store.getters['getDesignation'] === 3) {
          return [...halls.slice(0, 7), halls[8]]
        } else {
          return [halls[this.$store.getters['getHall']], halls[8]]
        }
      }
      return halls
    },
    // Determine which donation type is still pending and furthest from availability
    // Returns 'blood', 'platelet', or null (when both available)
    furthestPendingType () {
      const bloodPending = this.availableIn > 0
      const plateletPending = this.plateletAvailableIn > 0
      if (bloodPending && plateletPending) {
        return this.availableIn >= this.plateletAvailableIn ? 'blood' : 'platelet'
      }
      if (bloodPending) return 'blood'
      if (plateletPending) return 'platelet'
      return null
    }
  },
  methods: {
    async markAsActiveDonorHandler (markFlag) {
      this.activeDonorLoader = true
      if (markFlag) {
        const result = await handlePOSTActiveDonors({ donorId: this.id })
        this.activeDonorLoader = false
        if (result.status !== 201) return
        this.markedBy = this.$store.getters['getName']
        this.$store.dispatch('notification/notifySuccess', 'Donor marked as active donor')
        return
      }

      const result = await handleDELETEActiveDonors({ donorId: this.id })
      this.activeDonorLoader = false
      if (result.status !== 200) return
      this.markedBy = null
      this.$store.dispatch('notification/notifySuccess', 'Donor unmarked')
    },

    callRecordDeleted (id) {
      this.callRecords = this.callRecords.filter((callRecord) => callRecord._id !== id)
    },
    async publishToPublicContactClicked () {
      this.newPublicContactLoader = true
      const groupNameToCode = { 'A+': 0, 'B+': 2, 'O+': 4, 'AB+': 6, 'All Negative': -1 }
      const response = await handlePOSTPublicContacts({
        donorId: this.id,
        bloodGroup: groupNameToCode[this.selectedNewPublicContact]
      })
      this.newPublicContactLoader = false
      if (response.status !== 201) return
      this.publicContacts.push({ _id: response.data.publicContact._id, bloodGroup: groupNameToCode[this.selectedNewPublicContact] })
      this.$store.dispatch('notification/notifySuccess', 'Public Contacts Updated')
    },

    async deletePublicContactClicked (contactId) {
      this.deletePublicContactLoader = true
      const response = await handleDELETEPublicContacts({ donorId: this.id, contactId })
      this.deletePublicContactLoader = false
      if (response.status !== 200) return

      this.publicContacts = this.publicContacts.filter((publicContact) => {
        return publicContact._id !== contactId
      })

      this.$store.dispatch('notification/notifySuccess', 'Public Contacts Updated')
    },

    async createPasswordRecoveryLink () {
      this.passwordRecoveryFlag = true
      const response = await handlePOSTDonorsPasswordRequest({ donorId: this.id })
      this.passwordRecoveryFlag = false

      console.log(response.status)
      if (response.status !== 200) {
        return
      }
      await this.$store.dispatch('notification/notifySuccess', response.data.message)

      this.passwordRecoveryLink = environmentService.getFrontendBaseURL() + '/#/passwordReset?token=' + response.data.token
    },
    async passwordRecoveryLinkCopyClicked () {
      await this.$copyText(this.passwordRecoveryLink)
      this.passwordRecoveryTooltip = true
      setTimeout(() => {
        this.passwordRecoveryTooltip = false
      }, 2000)
    },
    shareClicked () {
      const routeData = this.$router.resolve({
        name: 'DetailsPage',
        query: {
          id: this.id
        }
      })
      // navigator.clipboard.writeText(process.env.VUE_APP_FRONTEND_BASE+routeData.href);
      this.$copyText(environmentService.getFrontendBaseURL()+ '/' + routeData.href).then((_e) => {
        this.showTooltip = true
        setTimeout(() => {
          this.showTooltip = false
        }, 2000)
      })
    },
    async changeHallAdminClicked () {
      this.changeAdminLoaderFlag = true
      const response = await handlePATCHAdmins( { donorId: this.id })
      this.changeAdminLoaderFlag = false
      if (response.status !== 200) return
      this.$store.dispatch('notification/notifySuccess', "Successfully changed hall admin")
      this.designation = 2
    },
    deleteDonorPrompt () {
      this.$store.commit('confirmationBox/setConfirmationMessage', {
        confirmationMessage: 'Delete this donor?',
        confirmationAction: this.deleteDonorConfirmed
      })
    },
    async deleteDonorConfirmed () {
      this.deleteDonorFlag = true
      const response = await handleDELETEDonors({ donorId: this.id })
      this.deleteDonorFlag = false
      if (response.status !== 200) return
      this.$store.dispatch('notification/notifySuccess', 'Deleted donor successfully')
      await this.$router.push('/home')
    },
    async callFromDialer () {
      const response = await handlePOSTCallRecord({ donorId: this.id })
      if (response.status !== 200) return
      const callRecords = this.callRecords
      const name = this.$store.getters['getName']
      callRecords.unshift({
        ...response.data.callRecord,
        callerId: { name, hall: this.$store.getters['getHall'], designation: this.$store.getters['getDesignation'] }
      })
      this.callRecords = callRecords
      this.$store.dispatch('notification/notifySuccess', 'Added call record')
      directCall('88'+this.phone)
      this.$forceUpdate()
    },
    datePrint (date) {
      const dateObj = new Date(date)
      return (
        dateObj.getDate() +
        '/' +
        (dateObj.getMonth() + 1) +
        '/' +
        dateObj.getFullYear()
      )
    },
    hideDetails () {
      this.showHistory = false
    },

    async saveCommentClicked () {
      let comment = this.comment
      if (this.comment === '') {
        comment = '(Unknown)'
      }

      this.commentLoaderFlag=true
      const response = await handlePATCHDonorsComment({
        donorId: this.id,
        comment: comment
      })
      this.commentLoaderFlag=false
      if (response.status !== 200) return

      this.$store.dispatch('notification/notifySuccess', 'Successfully changed comment')
      this.commentTime = new Date().getTime()
    },

    async deleteDonationClicked (date) {
      const response = await handleDELETEDonations({
        donorId: this.id,
        date: date
      })

      if(response.status !== 200) return
      this.$store.dispatch('notification/notifySuccess', 'Successfully deleted donation')

      for (let i = 0; i < this.donationList.length; i++) {
        if (this.donationList[i].date === date) {
          this.donationList.splice(i, 1)
          break
        }
      }

      let lastDonation = 0
      this.donationList.forEach((donationObject) => {
        if (lastDonation < donationObject.date) {
          lastDonation = donationObject.date
        }
      })
      const newDate = new Date(lastDonation)
      this.availableIn =
        120 -
        Math.round(
          (Math.round(new Date().getTime()) - newDate.getTime()) /
          (1000 * 3600 * 24)
        )
      if (lastDonation === 0) {
        this.lastDonation = '(Unknown)'
        return
      }
      this.lastDonation =
        newDate.getDate() +
        '/' +
        (newDate.getMonth() + 1) +
        '/' +
        newDate.getFullYear()


    },

    async promoteClicked () {
      this.promoteFlag = true
      const response = await handlePATCHDonorsDesignation({
        donorId: this.id,
        promoteFlag: true
      })
      if(response.status !== 200){
        return
      }
      await this.$store.dispatch('notification/notifySuccess', response.data.message)
      this.designation = 1
      this.promoteFlag = false
    },
    async demoteClicked () {
      this.promoteFlag = true
      const response = await handlePATCHDonorsDesignation({
        donorId: this.id,
        promoteFlag: false
      })
      if (response.status !== 200) {
        return
      }
      await this.$store.dispatch('notification/notifySuccess', response.data.message)
      this.designation = 0
      this.promoteFlag = false
    },
    async savePasswordClicked () {
      await this.$v.newPassword.$touch()
      await this.$v.confirmPassword.$touch()
      if (this.$v.newPassword.$error || this.$v.confirmPassword.$error) {
        return
      }
      this.passwordChangeFlag = true
      const response = await handlePATCHUsersPassword({
        donorId: this.id,
        password: this.newPassword
      })
      if(response.status === 200){
        return
      }
      if(!isGuestEnabled()) {
        this.$store.commit('setToken', response.data.token)
        this.$store.commit('saveTokenToLocalStorage')
      }
      this.passwordChangeFlag = false
      this.$store.dispatch('notification/notifySuccess', response.data.message)
    },
    async saveDetailsClicked () {
      await this.$v.name.$touch()
      await this.$v.phone.$touch()
      await this.$v.studentId.$touch()
      await this.$v.email.$touch()

      if (this.$v.name.$error || this.$v.phone.$error || this.$v.studentId.$error || this.$v.email.$error) {
        return
      }

      let room = this.room
      let address = this.address
      if (room === '') {
        room = '(Unknown)'
      }
      if (address === '') {
        address = '(Unknown)'
      }

      const sendData = {
        donorId: this.id,
        name: this.name,
        phone: parseInt('88' + this.phone),
        studentId: this.studentId,
        email: this.email,
        bloodGroup: bloodGroups.indexOf(this.bloodGroup),
        hall: halls.indexOf(this.hall),
        roomNumber: room,
        address: address,
        availableToAll: this.availableToAll
      }
      this.detailsLoaderFlag = true
      const response = await handlePATCHDonors(sendData)
      this.detailsLoaderFlag = false
      if (response.status !== 200) return
      this.$store.dispatch('notification/notifySuccess', 'Saved details successfully')
    },
    async donateClicked () {
      this.newDonationLoader = true
      const newDonationTimestamp = new Date(this.newDonationDate).getTime()
      let donationResponse
      if (this.newDonationType === 'Platelet') {
        donationResponse = await handlePOSTPlateletDonations({
          donorId: this.id,
          date: newDonationTimestamp
        })
      } else {
        donationResponse = await handlePOSTDonations({
          donorId: this.id,
          date: newDonationTimestamp
        })
      }
      this.newDonationLoader = false
      if (donationResponse.status !== 201) return
      this.$store.dispatch('notification/notifySuccess', donationResponse.data.message)
      if (this.newDonationType === 'Platelet') {
        this.plateletDonationList.push(donationResponse.data.newPlateletDonation)
        // compute platelet availability (12-day window for platelet)
        const newPlateletAvailableIn =
          12 -
          Math.round(
            (Math.round(new Date().getTime()) - newDonationTimestamp) /
            (1000 * 3600 * 24)
          )
        if (newPlateletAvailableIn > this.plateletAvailableIn) {
          this.plateletAvailableIn = newPlateletAvailableIn
        }
        this.lastPlateletDonation = this.datePrint(newDonationTimestamp)
      } else {
        const newAvailableIn =
          120 -
          Math.round(
            (Math.round(new Date().getTime()) - newDonationTimestamp) /
            (1000 * 3600 * 24)
          )
        this.donationList.push(donationResponse.data.newDonation)
        if (newAvailableIn > this.availableIn) {
          this.availableIn = newAvailableIn
          this.lastDonation = this.datePrint(newDonationTimestamp)
        }
      }
      this.newDonationDate = ''
      // keep type selection as-is for quick repeated entries
    },
    async deletePlateletDonationClicked (date) {
      const response = await handleDELETEPlateletDonations({
        donorId: this.id,
        date
      })
      if (response.status !== 200) return
      this.$store.dispatch('notification/notifySuccess', 'Successfully deleted platelet donation')

      for (let i = 0; i < this.plateletDonationList.length; i++) {
        if (this.plateletDonationList[i].date === date) {
          this.plateletDonationList.splice(i, 1)
          break
        }
      }

      let lastDonation = 0
      this.plateletDonationList.forEach((donationObject) => {
        if (lastDonation < donationObject.date) {
          lastDonation = donationObject.date
        }
      })
      const newDate = new Date(lastDonation)
      this.plateletAvailableIn =
        12 -
        Math.round(
          (Math.round(new Date().getTime()) - newDate.getTime()) /
          (1000 * 3600 * 24)
        )
      if (lastDonation === 0) {
        this.lastPlateletDonation = '(Unknown)'
        return
      }
      this.lastPlateletDonation = this.datePrint(lastDonation)
    }
  },
  async mounted () {
    this.donorErrorHappened = false
    this.dataLoaded = false
  
    const params = {
      donorId: this.$props.donorId
    }
    this.donorLoaderFlag = true

    const response = await handleGETDonors(params)

    this.donorLoaderFlag = false
    if (response.status !== 200){
      this.donorErrorHappened = true
      return
    }

    this.profile = response.data.donor
    this.callRecords = response.data.donor.callRecords
    this.donationList = response.data.donor.donations.map((a) => a.date)
    this.plateletDonationList = (response.data.donor.plateletDonations || []).map((a) => a.date)

    const profile = this.profile
    this.id = profile._id
    this.name = profile.name
    this.phone = profile.phone.toString().substr(2)
    this.oldPhone = profile.phone
    this.studentId = profile.studentId
    this.bloodGroup = bloodGroups[profile.bloodGroup]
    this.email = profile.email
    this.hall = halls[profile.hall]
    this.room = profile.roomNumber
    this.address = profile.address
    this.address = profile.address
    this.comment = fixBackSlash(profile.comment)
    this.designation = profile.designation
    this.commentTime = profile.commentTime
    this.availableToAll = profile.availableToAll
    this.publicContacts = profile.publicContacts
    this.callRecords = profile.callRecords
    this.donationList = profile.donations
    this.plateletDonationList = profile.plateletDonations || []
    // Some donors may have markedBy present without a populated markerId (or markerId without name); guard to avoid TypeError
    this.markedBy = (profile && profile.markedBy && profile.markedBy.name)
      ? profile.markedBy.name
      : null
    this.markedAsActiveDonor = !!this.markedBy

    const date = new Date(profile.lastDonation)
    this.lastDonation =
      date.getDate() +
      '/' +
      (date.getMonth() + 1) +
      '/' +
      date.getFullYear()
    if (profile.lastDonation === 0) {
      this.lastDonation = '(Unknown)'
    }

    const plateletDate = new Date(profile.lastPlateletDonation || 0)
    this.lastPlateletDonation =
      plateletDate.getDate() +
      '/' +
      (plateletDate.getMonth() + 1) +
      '/' +
      plateletDate.getFullYear()
    if (!profile.lastPlateletDonation || profile.lastPlateletDonation === 0) {
      this.lastPlateletDonation = '(Unknown)'
    }

    this.availableIn =
      120 -
      Math.round(
        (Math.round(new Date().getTime()) - date.getTime()) /
        (1000 * 3600 * 24)
      )

    this.plateletAvailableIn =
      12 -
      Math.round(
        (Math.round(new Date().getTime()) - plateletDate.getTime()) /
        (1000 * 3600 * 24)
      )

    this.dataLoaded = true

    this.$forceUpdate()
    this.personDetailCollapseFlag = !this.$isMobile()
  }
}
</script>
<style>

</style>


