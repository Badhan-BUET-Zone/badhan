<template>
  <v-card rounded class="d-flex justify-center rounded-xl">
    <!--    Main Filters-->
    <v-card-text>
      <div style="text-align: center" class="ma-auto h5">
        Filters
        <HelpTooltip>
      <div>
        You may choose any one of the following options.
        <ul>
          <li><b>Name: </b>Search any donor by name</li>
          <li><b>Blood group: </b>Search any donor by blood group</li>
          <li><b>Batch: </b>Donors from the specified batch will be fetched. Please enter a valid numeric two digit
            batch number (e.g. 16, 17 etc.)
          </li>
          <li><b>Address/ Comment: </b>Those donors will be shown whose comment or address field consists your written
            text
          </li>
          <li><b>Public Data: </b>If you choose this option, donors who are marked as public data will be fetched.
            Donors who were previously in "Attached/Covid" database are in this search criteria
          </li>
          <li><b>Specify Hall: </b>If you choose this option, donors of specified hall will be fetched. You can only
            search your own hall for donors in such case.
          </li>
          <li><b>Available: </b>Available only if last blood donation was before 120 days AND last platelet donation was before 12 days.</li>
          <li><b>Not Available: </b>Not available if blood donated within 120 days OR platelet donated within 12 days.</li>
          <li><b>Search archived donors: </b>Archived donors are kept out of every ordinary search. When this is on,
            the search returns archived donors <i>only</i>. It is turned on from Super Admin settings and switches
            itself off 24 hours later.
          </li>
        </ul>
      </div>
      </HelpTooltip>
      </div>

<!--      </v-card-subtitle>-->
        <v-container>
          <!--        Input field for name-->
          <TextField
            id="filterNameTextboxId"
            data-cy="filterNameTextboxId"
            v-model="name"
            :hint="'Search any donor by name'"
            label="Name of Donor"
            clearable
          />

          <Selector
            data-cy="bloodgroup-select"
            id="filterBloodgroupDropdownId"
            label="Blood Group"
            v-model="bloodGroup"
            :items="bloodGroups"
          />

          <!--        Input field for batch-->
          <TextField
              id="filterBatchTextboxId"
              data-cy="filterBatchTextboxId"
              v-model="batch"
              label="Batch"
              :hint="'Batch number (two digits)'"
              clearable
              @blur="$v.batch.$touch()"
              :error-messages="batchErrors"
          />

          <!--        Input field for hall-->
          <TextField
              id="filterAddressTextboxId"
              data-cy="filterAddressTextboxId"
              label="Address/ Comment"
              :hint="'Search in address/comment'"
              clearable
              v-model="address"
          />

          <v-radio-group row v-model="radios" dense>
            <v-radio value="AvailableToAll" id="filterPublicDataRadioId" data-cy="filterPublicDataRadioId">
              <template v-slot:label>
                Public Data
              </template>
            </v-radio>
            <v-radio value="SpecifyHall" id="filterSpecifyHallRadioId" data-cy="filterSpecifyHallRadioId">
              <template v-slot:label>
                Specify hall
              </template>
            </v-radio>
          </v-radio-group>
          <Selector
            id="filterSpecifyHallDropdownId"
            data-cy="hall-select"
            :disabled="radios !== 'SpecifyHall'"
            v-model="hall"
            :items="availableHalls"
            label="Select Hall"
            @blur="$v.hall.$touch()"
            :error-messages="hallErrors"
          />

          <v-row>
            <v-col>
              <div data-cy="available-checkbox">
                <v-checkbox
                  id="filterAvailableCheckboxId"
                  dense
                  v-model="availability"
                  label="Available"
                  :error-messages="availabilityErrors"
                />
              </div>
            </v-col>
            <v-col>
              <div data-cy="not-available-checkbox">
                <v-checkbox
                  id="filterNotAvailableCheckboxId"
                  dense
                  v-model="notAvailability"
                  label="Not Available"
                />
              </div>
            </v-col>
          </v-row>

          <!--        A read-only mirror of the super admin setting, not an input-->
          <v-checkbox
            v-if="$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN"
            id="filterArchiveSearchCheckboxId"
            data-cy="filterArchiveSearchCheckboxId"
            dense
            disabled
            :input-value="archiveSearchEnabled"
            label="Search archived donors"
            :messages="'Changeable only from Super Admin settings'"
          />

          <!--        A button to reset the form fields-->
          <v-btn rounded color="secondary" @click="clearFields" class="ma-2">
            <v-icon left>
              mdi-refresh
            </v-icon>
            Reset
          </v-btn>

          <!--        The button for executing search-->
          <v-btn
              id="filterSearchButtonId"
              data-cy="filterSearchButtonId"
              rounded
              color="primary"
              :disabled="isSearchLoading || $v.$anyError"
              @click="searchClickInsideComponent"
              class="ma-2"
          >
            <v-icon left>
              mdi-magnify
            </v-icon>
            Search
          </v-btn>
        </v-container>
    </v-card-text>
  </v-card>
</template>

<script>
import TextField from '@/components/UI Components/TextField.vue'
import HelpTooltip from '@/components/UI Components/HelpTooltip'
import Selector from '@/components/UI Components/Selector.vue'
import { DESIGNATIONS_INDEX, bloodGroups, halls, isHallRestricted, restrictedHallNames } from '@/mixins/constants'
import ldb from '@/localDatabase'
import { maxLength, minLength, numeric, required } from 'vuelidate/lib/validators'

export default {
  name: 'FiltersComponent',
  props: {
    searchClicked: {
      type: Function,
      required: true
    },
    resetClicked: {
      type: Function,
      required: true
    }
  },
  components: {
    HelpTooltip,
    Selector,
    TextField
  },
  methods: {
    clearFields () {
      this.$v.$reset()
      this.batch = ''
      this.hall = halls[this.$store.getters['getHall']]
      this.bloodGroup = ''
      this.name = ''
      this.error = ''
      this.address = ''
      this.showFab = false
      this.resetClicked()
    },
    async searchClickInsideComponent () {
      await this.$v.$touch()
      if (this.$v.$anyError) {
        return
      }
      this.isSearchLoading = true
      await this.searchClicked({
        name: this.name,
        bloodGroup: this.bloodGroup,
        batch: this.batch,
        hall: this.hall,
        availability: this.availability,
        notAvailability: this.notAvailability,
        address: this.address,
  availableToAll: this.radios,
        archiveFlag: this.archiveSearchEnabled
      })
      this.isSearchLoading = false
    }
  },
  validations: () => {
    return {
      batch: {
        minLength: minLength(2),
        maxLength: maxLength(2),
        numeric
      },
      availability: {
        putAtLeastOneCheck(){
          return this.availability | this.notAvailability
        }
      },
      hall: {
        required,
        permission (hall) {
          // COVID DATABASE
          return !(this.$store.getters['getHall'] !== this.halls.indexOf(hall) && isHallRestricted(this.halls.indexOf(hall)) && this.$store.getters['getDesignation'] !== DESIGNATIONS_INDEX.SUPER_ADMIN)
        }
      }
    }
  },
  computed: {
    // The whole enforcement mechanism: the backend takes archiveFlag at face value, so a
    // non-super-admin's payload is hardcoded to false here rather than implied by the
    // hidden control. Also where the TTL write-back happens — the store is seeded once at
    // boot, so a window left open past the 24 h would otherwise keep reporting `true`
    // after ldb has already expired the key. The commit can only fire on the true→false
    // edge, after which the next evaluation does nothing, so it cannot loop.
    archiveSearchEnabled () {
      const stored = ldb.archiveSearch.load()
      const inStore = this.$store.getters['archiveSearch/getArchiveSearchEnabled']
      if (!stored && inStore) {
        this.$store.commit('archiveSearch/setArchiveSearchEnabled', false)
      }
      return this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN &&
             inStore && stored
    },
    availableHalls () {
      if (this.$store.getters['getDesignation'] !== null) {
        if (this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN) {
          return restrictedHallNames()
        } else {
          return [halls[this.$store.getters['getHall']]]
        }
      }
      return halls
    },
    batchErrors () {
      const errors = []
      if (!this.$v.batch.$dirty) return errors
      !this.$v.batch.minLength && errors.push('Batch number must be of 2 digits')
      !this.$v.batch.maxLength && errors.push('Batch number must be of 2 digits')
      !this.$v.batch.numeric && errors.push('Batch number must be numeric')
      return errors
    },
    availabilityErrors () {
      if (!this.$v.availability.$dirty) return null
      if (!this.$v.availability.putAtLeastOneCheck) return 'Please put tick on at least one checkbox'
      return null
    },
    hallErrors () {
      const errors = []
      if (!this.$v.hall.$dirty) return errors
      !this.$v.hall.required && errors.push('Hall is required')
      !this.$v.hall.permission && errors.push('You are not allowed to create donor for this hall')
      return errors
    }
  },
  data: function () {
    return {
      name: '',
      bloodGroup: '',
      batch: '',
      address: '',
      hall: halls[this.$store.getters['getHall']],
      availability: true,
      notAvailability: false,
  

      // GUI flags
      filterShown: true,

      // imported constants
      halls,
      bloodGroups,
      // exposed for the template, which cannot see module imports
      DESIGNATIONS_INDEX,

      showTooltip: false,
      showFilterHelpTooltip: false,

      radios: 'AvailableToAll',
      showFab: false,

      downloadCSVMessageFlag: false,
      isSearchLoading: false
    }
  }
}
</script>

<style scoped>

</style>
