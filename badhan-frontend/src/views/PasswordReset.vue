<template>
  <div>
    <PageTitle></PageTitle>
    <Container v-if="!tokenCheckLoader">
      <v-card-text>
        Welcome back {{name}} ({{designation|getDesignationString}}). Please specify new password to reset your password.
      </v-card-text>
      <v-card-text>
        <TextField @blur="$v.newPassword.$touch()"
                      :error-messages="newPasswordErrors" @click:append="newPasswordFlag = !newPasswordFlag" :type="newPasswordFlag ? 'text' : 'password'" :append-icon="newPasswordFlag ? 'mdi-eye' : 'mdi-eye-off'" v-model="newPassword" label="New Password" :hint="''"></TextField>
        <TextField @blur="$v.confirmPassword.$touch()"
                      :error-messages="confirmPasswordErrors" @click:append="confirmPasswordFlag = !confirmPasswordFlag" :append-icon="confirmPasswordFlag ? 'mdi-eye' : 'mdi-eye-off'"
                      :type="confirmPasswordFlag ? 'text' : 'password'" v-model="confirmPassword" label="Confirm Password" :hint="''"></TextField>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="changePasswordClicked" :disabled="passwordChangeFlag || $v.$anyError" rounded color="primary">
          <v-icon left>
            mdi-content-save
          </v-icon>
          Save
        </v-btn>
      </v-card-actions>
    </Container>
  </div>
</template>

<script>
import TextField from '@/components/UI Components/TextField.vue'
import Container from '@/components/Container/Container'
import PageTitle from '@/components/PageTitle'
import { handlePATCHUsersPassword } from '@/api'
import { required, minLength, sameAs } from 'vuelidate/lib/validators'
import { HTTP_STATUS } from '@/mixins/constants'

export default {
  name: 'PasswordReset',
  validations: {
    newPassword: {
      required,
      minLength: minLength(6)
    },
    confirmPassword: {
      sameAs: sameAs('newPassword')
    }
  },
  computed: {
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
    }
  },
  components: {
    PageTitle,
    Container,
    TextField
  },
  async mounted () {
    this.$store.commit('setToken', this.$route.query.token)
    this.tokenCheckLoader = true
    const donor = await this.$store.dispatch('checkToken')
    if (donor) {
      this.name = donor.name
      this.designation = donor.designation
    } else {
      await this.$router.push('/')
    }
    this.tokenCheckLoader = false
  },
  data: () => {
    return {
      newPassword: null,
      confirmPassword: null,
      passwordChangeFlag: false,
      newPasswordFlag: false,
      confirmPasswordFlag: false,

      tokenCheckLoader: false,
      designation: 0,
      name: ''
    }
  },

  methods: {
    async changePasswordClicked () {
      await this.$v.$touch()
      if (this.$v.$anyError) {
        return
      }

      this.$store.commit('setToken', this.$route.query.token)
      this.passwordChangeFlag = true
      const response = await handlePATCHUsersPassword({ password: this.newPassword })
      this.passwordChangeFlag = false
      if (response.status !== HTTP_STATUS.CREATED) {
        this.$store.commit('removeToken')
        return
      }
      this.$store.dispatch('notification/notifySuccess', response.data.message)
      this.$store.commit('setToken', response.data.token)
      this.$store.commit('saveTokenToLocalStorage')
      if (await this.$store.dispatch('autoLogin')) {
        await this.$router.push({ name: 'Home' })
      }
    }
  }
}
</script>

<style scoped>

</style>
