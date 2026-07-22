<template>
  <Container>
    <v-card-text>
      <TextField id="newDonorNameTextBoxId" data-cy="newDonorNameTextBoxId" class="required" label="Name of Donor" v-model="name"
                    :hint="''"
                    @blur="$v.name.$touch()"
                    :error-messages="nameErrors"></TextField>
      <TextField id="newDonorPhoneTextBoxId" data-cy="newDonorPhoneTextBoxId" :loading="phoneDuplicateCheckLoader" :disabled="phoneDuplicateCheckLoader" class="required" label="Phone" v-model="computedPhone" :hint="''" @blur="$v.phone.$touch()"
                    :error-messages="phoneErrors"></TextField>
      <transition name="slide-fade-down">
        <v-btn id="donorCreationSeeDuplicateButtonId" v-if="duplicateDonorId!==null" small class="mb-2" color="primary" rounded @click="goToDuplicateProfile">
          <v-icon left>
            mdi-content-duplicate
          </v-icon>
          See Duplicate
        </v-btn>
      </transition>

      <TextField id="newDonorStudentIdTextBoxId" data-cy="newDonorStudentIdTextBoxId" class="required" label="Student ID" v-model="studentId" :hint="'If the department is unknown, give 00 as dept. code'"
                    @blur="$v.studentId.$touch()"
                    :error-messages="studentIdErrors"
      >
        <template v-slot:message>
          <span>{{ studentIdErrors[0] }}</span>
          <span>If the department is unknown, give 00 as dept. code</span>
          <div v-if="$v.studentId.$invalid">
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                    color="info"
                    x-small
                    v-bind="attrs"
                    v-on="on"
                    text
                >
                  Click to see the departments
                </v-btn>

              </template>
              <v-list>
                <span v-for="(item, index) in departments" :key="index">
                  <v-list-item v-if="item !== nullDepartment">
                    <v-list-item-title>{{ item }} ({{index}})</v-list-item-title>
                  </v-list-item>
                </span>
              </v-list>
            </v-menu>
          </div>
        </template>
      </TextField>

      <Selector id="newDonorBloodGroupDropDownId" data-cy="newDonorBloodGroupDropDownId" class="required" v-model="bloodGroup" :items="bloodGroups" label="Blood Group"
                @blur="$v.bloodGroup.$touch()"
                :error-messages="bloodGroupErrors" />

      <TextField id="newDonorRoomNumberTextFieldId" data-cy="newDonorRoomNumberTextFieldId" label="Room" v-model="roomNumber" :hint="''"></TextField>
      <TextField id="newDonorAddressTextFieldId" data-cy="newDonorAddressTextFieldId" label="Address" v-model="address" :hint="''"></TextField>
      <TextField id="newDonorCommentTextFieldId" data-cy="newDonorCommentTextFieldId" label="Comment" v-model="comment" :hint="''"></TextField>
      <TextField id="newDonorDonationCountTextFieldId" data-cy="newDonorDonationCountTextFieldId" class="required" label="Donation count" v-model="donationCount"
                    :hint="''"
                    @blur="$v.donationCount.$touch()"
                    :error-messages="donationCountErrors"></TextField>
      <TextField id="newDonorPlateletDonationCountTextFieldId" data-cy="newDonorPlateletDonationCountTextFieldId" label="Platelet donation count" v-model="plateletDonationCount"
            :hint="''"
            @blur="$v.plateletDonationCount.$touch()"
            :error-messages="plateletDonationCountErrors">
      </TextField>
        <Selector
          id="newDonorHallDropdownId"
          data-cy="hall-select"
          class="required"
          :items="availableHalls"
          label="Select Hall"
          v-model="hall"
          @blur="$v.hall.$touch()"
          :error-messages="hallErrors"
        />


          <v-checkbox id="newDonorPublicDataCheckboxId" data-cy="newDonorPublicDataCheckboxId" :disabled="isHallUnknown(halls.indexOf(hall))" dense v-model="availableToAll"
                      @blur="$v.availableToAll.$touch()" :error-messages="availableToAllErrors"
                      label="Public Data"></v-checkbox>

      <DatePicker
        v-model="lastDonation"
        label="Last Donation"
        text-field-id="newDonorLastDonationTextFieldId"
        ok-button-id="newDonorLastDonationOkButtonId"
      />
      <DatePicker
        v-model="lastPlateletDonation"
        label="Last Platelet Donation"
        text-field-id="newDonorLastPlateletDonationTextFieldId"
        ok-button-id="newDonorLastPlateletDonationOkButtonId"
      />
    </v-card-text>
    <v-card-actions>
      <v-btn small color="primary" rounded @click="discardClicked">
        <v-icon left>
          mdi-delete
        </v-icon>
        Discard
      </v-btn>
      <v-btn id="newDonorCreateButtonId" data-cy="newDonorCreateButtonId" small color="primary" rounded @click="createDonorClicked"
             :disabled="donorCreationLoader|| $v.$anyError || warnings.length!==0 ">
        <v-icon left>
          mdi-account-plus
        </v-icon>
        Create
      </v-btn>
    </v-card-actions>

    <v-alert color="warning" v-for="(warning, index) in warnings" :key="index">{{ warning }}</v-alert>
  </Container>
</template>

<script>
import { DESIGNATIONS_INDEX, HALLS_INDEX, HTTP_STATUS, bloodGroups, departments, halls, isHallRestricted, isHallUnknown, nullDepartment, restrictedHallNames } from '@/mixins/constants'
import { required, minLength, maxLength, numeric } from 'vuelidate/lib/validators'
import { handleGETDonorsDuplicate, handlePOSTDonors } from '@/api'
import Container from '@/components/Container/Container'
import DatePicker from '@/components/UI Components/DatePicker.vue'
import TextField from '@/components/UI Components/TextField.vue'
import Selector from '@/components/UI Components/Selector.vue'
import { environmentService } from '@/mixins/environment'
import { createNewPopUpWindow } from '@/mixins/helpers'

export default {
  name: 'NewPersonCard',
  props: ['donor', 'discardDonor'],
  components: {
    Container,
    DatePicker,
    Selector,
    TextField
  },
  validations: () => {
    return {
      phone: {
        required,
        minLength: minLength(11),
        maxLength: maxLength(11),
        numeric,
        async uniqueCheck (phone) {
          if (!phone || phone.length !== 11 || isNaN(parseInt(phone))) return true

          this.duplicateDonorId = null
          this.duplicateDonorMessage = 'Checking phone...'
          this.phoneDuplicateCheckLoader = true
          const response = await handleGETDonorsDuplicate({ phone: '88' + phone })
          this.phoneDuplicateCheckLoader = false

          if (response.status !== HTTP_STATUS.OK) return false

          this.duplicateDonorId = response.data.donor ? response.data.donor._id : null
          this.duplicateDonorMessage = response.data.message
          return !response.data.found
        }
      },
      name: {
        required
      },
      bloodGroup: {
        required
      },
      studentId: {
        minLength: minLength(7),
        maxLength: maxLength(7),
        numeric,
        required,
        departmentCheck (studentId) {
          const indexOfDepartment = parseInt(String(studentId).substr(2, 2))
          return indexOfDepartment <= departments.length;

        }
      },
      hall: {
        required,
        permission (hall) {
          // COVID DATABASE
          return !(this.$store.getters['getHall'] !== this.halls.indexOf(hall) && isHallRestricted(this.halls.indexOf(hall)) && this.$store.getters['getDesignation'] !== DESIGNATIONS_INDEX.SUPER_ADMIN)
        }
      },
      donationCount: {
        maxLength: maxLength(2),
        numeric,
        required,
        lastDonationCheck (value) {
          return !((this.lastDonation === null || this.lastDonation === '') && parseInt(value) !== 0)
        },
        lastDonationCheck2 (value) {
          return !((this.lastDonation !== null && this.lastDonation !== '') && parseInt(value) === 0)
        }
      },
      plateletDonationCount: {
        maxLength: maxLength(2),
        numeric,
        // optional (can be zero without date)
        lastDonationCheck (value) {
          return !((this.lastPlateletDonation === null || this.lastPlateletDonation === '') && value !== null && parseInt(value) !== 0)
        },
        lastDonationCheck2 (value) {
          return !((this.lastPlateletDonation !== null && this.lastPlateletDonation !== '') && parseInt(value) === 0)
        }
      },
      availableToAll: {
        isBoolean: (value) => {
          return typeof value === 'boolean'
        }
      }
    }
  },
  computed: {
    computedPhone: {
      get () {
        return this.phone
      },
      set (val) {
        if (this.timeout) clearTimeout(this.timeout)
        this.timeout = setTimeout(() => {
          this.phone = val
        }, 2000)
      }
    },

    availableHalls () {
      return [...restrictedHallNames(), halls[HALLS_INDEX.UNKNOWN]]
    },
    phoneErrors () {
      const errors = []
      if (!this.$v.phone.$dirty) return errors
      !this.$v.phone.minLength && errors.push('Phone must be 11 digits long')
      !this.$v.phone.maxLength && errors.push('Phone must be 11 digits long')
      !this.$v.phone.required && errors.push('Phone is required')
      !this.$v.phone.numeric && errors.push('Phone must be numeric')
      !this.$v.phone.uniqueCheck && errors.push(this.duplicateDonorMessage)
      return errors
    },
    nameErrors () {
      const errors = []
      if (!this.$v.name.$dirty) return errors
      !this.$v.name.required && errors.push('Name is required')
      return errors
    },
    studentIdErrors () {
      const errors = []
      if (!this.$v.studentId.$dirty) return errors
      !this.$v.studentId.minLength && errors.push('Student ID must be 7 digits long. ')
      !this.$v.studentId.maxLength && errors.push('Student ID must be 7 digits long')
      !this.$v.studentId.required && errors.push('Student ID is required. ')
      !this.$v.studentId.numeric && errors.push('Student ID must be numeric. ')
      !this.$v.studentId.departmentCheck && errors.push('Invalid department ID. ')
      return errors
    },
    bloodGroupErrors () {
      const errors = []
      if (!this.$v.bloodGroup.$dirty) return errors
      !this.$v.bloodGroup.required && errors.push('Blood group is required')
      return errors
    },
    hallErrors () {
      const errors = []
      if (!this.$v.hall.$dirty) return errors
      !this.$v.hall.required && errors.push('Hall is required')
      !this.$v.hall.permission && errors.push('You are not allowed to create donor for this hall')
      return errors
    },
    donationCountErrors () {
      const errors = []
      if (!this.$v.donationCount.$dirty) return errors
      !this.$v.donationCount.maxLength && errors.push('Max donation count can be 99')
      !this.$v.donationCount.required && errors.push('Minimum donation count must be zero')
      !this.$v.donationCount.numeric && errors.push('Donation count must be numeric')
      !this.$v.donationCount.lastDonationCheck && errors.push('Last donation must be specified if donation count is non-zero')
      !this.$v.donationCount.lastDonationCheck2 && errors.push('Donation count must be non-zero if last donation is specified')
      return errors
    },
    plateletDonationCountErrors () {
      const errors = []
      if (!this.$v.plateletDonationCount.$dirty) return errors
      !this.$v.plateletDonationCount.maxLength && errors.push('Max platelet donation count can be 99')
      !this.$v.plateletDonationCount.numeric && errors.push('Platelet donation count must be numeric')
      !this.$v.plateletDonationCount.lastDonationCheck && errors.push('Last platelet donation must be specified if count is non-zero')
      !this.$v.plateletDonationCount.lastDonationCheck2 && errors.push('Platelet donation count must be non-zero if last platelet donation is specified')
      return errors
    },
    availableToAllErrors () {
      const errors = []
      if (!this.$v.availableToAll.$dirty) return errors
      !this.$v.availableToAll.isBoolean && errors.push('Max donation count can be 99')
      return errors
    }
  },

  watch: {
    'hall' (to, _from) {
      if (to === '(Unknown)') {
        this.availableToAll = true
      }
    }
  },

  data: () => {
    return {
      halls,
      bloodGroups,
      departments,
      nullDepartment,

      name: '',
      phone: '',
      studentId: '',
      bloodGroup: '',
      // hall: halls[this.$store.getters['getHall']],
      hall: '',
      address: '',
      roomNumber: '',
      comment: '',
      donationCount: 0,
      lastDonation: '',
      plateletDonationCount: 0,
      lastPlateletDonation: '',
      availableToAll: false,

      donorCreationLoader: false,
      warnings: [],
      duplicateDonorId: null,

      departmentListShown: false,
      timeout: null,
      phoneDuplicateCheckLoader: false,
      duplicateDonorMessage: '',

      
      newDonorLoader: false
    }
  },
  
  created () {
    const now = new Date()
    this.today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().substr(0, 10)
    const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    this.tomorrow = tomorrowDate.toISOString().substr(0, 10)
  },

  mounted () {
  const keysExpected = ['name', 'phone', 'studentId', 'bloodGroup', 'hall', 'address', 'roomNumber', 'comment', 'donationCount', 'lastDonation', 'plateletDonationCount', 'lastPlateletDonation', 'key', 'availableToAll']
  // Accept new platelet fields but don't warn if missing (backward compatibility)
    if (this.$props && this.$props.donor) {
    Object.keys(this.$props.donor).forEach((key) => {
      if (!keysExpected.includes(key)) {
        this.warnings.push('Unwanted key found: ' + key)
      }
    })

    keysExpected.forEach((expectedKey) => {
      if (!Object.keys(this.$props.donor).includes(expectedKey)) {
        this.warnings.push('Missing key: ' + expectedKey)
      }
    })
    }

    this.name = this.$props.donor && this.$props.donor.name ? String(this.$props.donor.name) : ''
    this.phone = this.$props.donor && this.$props.donor.phone != null ? String(this.$props.donor.phone).replace(/^88/, '') : ''
    this.studentId = this.$props.donor && this.$props.donor.studentId != null ? String(this.$props.donor.studentId) : ''
    this.bloodGroup = (this.$props.donor && typeof this.$props.donor.bloodGroup === 'number' && this.bloodGroups[this.$props.donor.bloodGroup] !== undefined)
      ? this.bloodGroups[this.$props.donor.bloodGroup]
      : ''

    this.hall = (this.$props.donor && typeof this.$props.donor.hall === 'number' && this.halls[this.$props.donor.hall] !== undefined)
      ? this.halls[this.$props.donor.hall]
      : ''

    this.address = this.$props.donor && this.$props.donor.address ? String(this.$props.donor.address) : ''
    this.roomNumber = this.$props.donor && this.$props.donor.roomNumber ? String(this.$props.donor.roomNumber) : ''
    this.comment = this.$props.donor && this.$props.donor.comment ? String(this.$props.donor.comment) : ''
    this.donationCount = this.$props.donor && this.$props.donor.donationCount != null ? Number(this.$props.donor.donationCount) : 0
    this.availableToAll = !!(this.$props.donor && this.$props.donor.availableToAll)

    // platelet optional initialization
    if (this.$props.donor && this.$props.donor.plateletDonationCount !== undefined && this.$props.donor.plateletDonationCount !== null) {
      this.plateletDonationCount = Number(this.$props.donor.plateletDonationCount)
    }
    if (this.$props.donor && this.$props.donor.lastPlateletDonation) {
      this.lastPlateletDonation = (new Date(this.$props.donor.lastPlateletDonation)).toISOString().substr(0, 10)
    }

    if (this.$props.donor && this.$props.donor.lastDonation !== 0 && this.$props.donor.lastDonation !== null) {
      this.lastDonation = (new Date(this.$props.donor.lastDonation)).toISOString().substr(0, 10)
    }
  },
  methods: {
    // exposed for the template, which cannot see module imports
    isHallUnknown,
    async createDonorClicked () {
      await this.$v.$touch()
      if (this.$v.$anyError) {
        return
      }

      let lastDonation
      if (this.lastDonation === null || this.lastDonation === '') {
        lastDonation = 0
      } else {
        lastDonation = new Date(this.lastDonation).getTime()
      }

      let lastPlateletDonation
      if (this.lastPlateletDonation === null || this.lastPlateletDonation === '') {
        lastPlateletDonation = 0
      } else {
        lastPlateletDonation = new Date(this.lastPlateletDonation).getTime()
      }

      if (this.comment === '' || this.comment === null) this.comment = '(Unknown)'
      if (this.address === '' || this.address === null) this.address = '(Unknown)'
      if (this.roomNumber === '' || this.roomNumber === null) this.roomNumber = '(Unknown)'

      const newDonor = {
        name: String(this.name),
        phone: Number('88' + this.phone),
        bloodGroup: Number(this.bloodGroups.indexOf(this.bloodGroup)),
        hall: Number(this.halls.indexOf(this.hall)),
        studentId: Number(this.studentId),
        address: this.address,
        roomNumber: this.roomNumber,
        comment: this.comment,
        lastDonation: lastDonation,
        extraDonationCount: lastDonation === 0 ? 0 : this.donationCount - 1,
  availableToAll: this.availableToAll,
  lastPlateletDonation: lastPlateletDonation,
  extraPlateletDonationCount: lastPlateletDonation === 0 ? 0 : this.plateletDonationCount - 1
      }

      this.donorCreationLoader = true
      const response = await handlePOSTDonors(newDonor)
      if (response.status !== HTTP_STATUS.CREATED) return
      this.$store.dispatch('notification/notifySuccess', 'Donor added successfully')
      this.donorCreationLoader = false
    },
    goToDuplicateProfile () {
      createNewPopUpWindow(environmentService.getFrontendBaseURL()+ '#/home/details?id=' + this.duplicateDonorId)
    },
    async discardClicked () {
      if (this.discardDonor !== null) {
        this.discardDonor(this.$props.donor.key)
        return
      }
      await this.$v.$reset()

      this.name = ''
      this.phone = ''
      this.studentId = ''
      this.bloodGroup = ''

      this.hall = halls[this.$store.getters['getHall']]

      this.address = ''
      this.roomNumber = ''
      this.comment = ''
      this.donationCount = 0
      this.lastDonation = ''
  this.plateletDonationCount = 0
  this.lastPlateletDonation = ''

      this.availableToAll = false

      this.key = new Date().getTime()

      this.duplicateDonorId = null
    }

  }

}
</script>

<style scoped>

</style>
