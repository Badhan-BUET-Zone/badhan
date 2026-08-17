<template>
  <div>
    <section id="hero">
      <v-row no-gutters>
        <v-img
            min-height="90vh"
            src="../assets/cover.png"
        >
          <v-theme-provider>
            <v-container fill-height>
              <v-row
                  align="center"
                  class="mx-auto"
                  justify="center"

              >
                <v-col
                    class="text-center"
                    cols="12"
                    sm="8"
                    tag="h1"
                >
                  <transition-group name="slide-fade-down-snapout" type="out-in">
                    <div key="titlekey">
                      <img
                          src="../assets/images/badhanlogo.png"
                          style="width: 100px; height: 100px"
                      />
                      <br>
                      <span
                          class="font-weight-bold"
                      >
                        Badhan
                      </span>
                      <p class="subtitle-2">BUET Zone</p>
                      <v-chip
                          color="secondary"
                      >
                        {{$getEnvironmentName()}}
                      </v-chip>
                    </div>
                    <DonationsMonthlyBarChart :key="'barchartKey'" />

                  </transition-group>
                </v-col>
                <v-col class="text-center"
                       cols="12"
                       sm="4">
                  <div>
                    <TextField
                        id="signInPhoneTextBox"
                        data-cy="signInPhoneTextBox"
                        label="Phone"
                        :hint="'Enter your 11 digit phone number'"
                        class="input-group--focused"
                        v-model="phone"
                        @blur="$v.phone.$touch()"
                        :error-messages="phoneErrors"
                    />
                    <TextField
                        id="signInPasswordTextBox"
                        data-cy="signInPasswordTextBox"
                        label="Password"
                        class="input-group--focused"
                        :append-icon="passwordFlag ? 'mdi-eye' : 'mdi-eye-off'"
                        :type="passwordFlag ? 'text' : 'password'"
                        v-model="password"
                        @click:append="passwordFlag = !passwordFlag"
                        @blur="$v.password.$touch()"
                        :error-messages="passwordErrors"
                        :hint="'Enter your password'"
                    />
                    <v-btn
                        color="primary"
                        rounded
                        class="ma-1"
                        @click="signInClicked()"
                        :disabled="$store.getters['getSignInLoaderFlag'] || $v.$anyError"
                        id="signInButton"
                        data-cy="signInButton"
                    >
                      <v-icon left>
                        mdi-login
                      </v-icon>
                      Sign In
                    </v-btn>
                    <br>
                    <!-- <div class="d-flex"> -->
                      <v-btn
                          id="guestSignInButtonId"
                          x-small
                          text
                          color="primary"
                          rounded
                          class="ma-1"
                          @click="guestSignInClicked"
                          :disabled="$store.getters['getSignInLoaderFlag']"
                      >
                        Or, login as guest
                      </v-btn>
                    <!-- </div> -->
                  </div>
                </v-col>
                <v-col class="text-center" cols="12" sm="4">
                  <v-btn
                      x-small
                      color="primary"
                      class="align-self-end ma-1"
                      outlined
                      rounded
                      style="text-decoration: none"
                      :to="'/about'"
                  >
                    About the App
                  </v-btn>
                  <v-btn
                      x-small
                      color="primary"
                      rounded
                      class="align-self-end ma-1"
                      outlined
                      style="text-decoration: none"
                      :href="playStoreUrl"
                  >
                    Download App
                    <v-icon right>mdi-google-play</v-icon>
                  </v-btn>
                  <v-btn
                      x-small
                      color="primary"
                      class="align-self-end ma-1"
                      outlined
                      rounded
                      style="text-decoration: none"
                      :to="'/credits'"
                  >
                    Know the Developers
                  </v-btn>
                  <v-btn x-small class="align-self-end ma-1"
                         color="primary"
                         rounded
                         outlined
                         style="text-decoration: none"
                         :to="'/contacts'">
                    Emergency Contacts
                  </v-btn>
                </v-col>
              </v-row>
            </v-container>
          </v-theme-provider>
        </v-img>
      </v-row>
    </section>
  </div>
</template>

<script>
import { required, minLength, maxLength } from 'vuelidate/lib/validators'
import DonationsMonthlyBarChart from '@/components/DonationsMonthlyBarChart.vue'
import TextField from '@/components/UI Components/TextField.vue'
import { PLAY_STORE_URL } from '@/mixins/constants'

export default {
  name: 'SignInCover',
  components: { DonationsMonthlyBarChart, TextField },
  data () {
    return {
      detailsFlag: false,
      phone: '',
      password: '',
      passwordFlag: false
    }
  },
  validations: {
    phone: {
      required,
      minLength: minLength(11),
      maxLength: maxLength(11)
    },
    password: {
      required,
      minLength: minLength(4)
    }
  },
  watch: {},
  computed: {
    playStoreUrl () {
      return PLAY_STORE_URL
    },
    getBuildTime () {
      return new Date(document.documentElement.dataset.buildTimestampUtc).toLocaleString()
    },
    phoneErrors () {
      const errors = []
      if (!this.$v.phone.$dirty) return errors
      !this.$v.phone.minLength && errors.push('Phone must be at least 11 digits long')
      !this.$v.phone.maxLength && errors.push('Phone must be at least 11 digits long')
      !this.$v.phone.required && errors.push('Phone is required.')
      return errors
    },
    passwordErrors () {
      const errors = []
      if (!this.$v.password.$dirty) return errors
      !this.$v.password.required && errors.push('Password is required.')
      !this.$v.password.minLength && errors.push('Password is must be more than 3 characters')
      return errors
    }

  },
  methods: {
    async signInClicked () {
      await this.$v.$touch()
      if (this.$v.$anyError) {
        return
      }

      const isSignInOk = await this.$store.dispatch('login',{
        phone: this.phone,
        password: this.password,
        rememberFlag: true
      })

      if (isSignInOk) {
        if (this.$store.getters['getAutoRedirectionPath']) {
          await this.$router.push(this.$store.getters['getAutoRedirectionPath'])
          this.$store.commit('unsetAutoRedirectionPath')
          return
        }
        await this.$router.push('/home')
      }
    },

    async guestSignInClicked () {
      await this.$store.dispatch('guestLogin')
      await this.$router.push('/home')
    },
  },
}
</script>

<style scoped>

</style>
