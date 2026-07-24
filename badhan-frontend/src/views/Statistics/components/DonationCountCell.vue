<template>
    <!-- Zero-count cells are plain text: there is nothing to drill into -->
    <span v-if="count === 0" class="grey--text">0</span>
    <v-menu v-else v-model="menu" :close-on-content-click="false" offset-y max-width="320">
        <template v-slot:activator="{ on, attrs }">
            <span class="donation-count-cell primary--text text-decoration-underline"
                :data-cy="dataCy" v-bind="attrs" v-on="on" @click="loadDonors">{{ count }}</span>
        </template>
        <v-card>
            <v-card-subtitle class="pb-1">{{ title }}</v-card-subtitle>
            <v-card-text v-if="loader" class="text-center py-4" data-cy="donationCountCellLoader">
                <v-progress-circular indeterminate color="primary" size="32" />
            </v-card-text>
            <v-card-text v-else-if="errorHappened" data-cy="donationCountCellError">Could not load donors</v-card-text>
            <v-list v-else dense max-height="300" class="overflow-y-auto" data-cy="donationCountCellList">
                <v-list-item v-for="(donation, index) in donations" :key="index"
                    :data-cy="'donationCountCellDonor'" @click="goToDonorProfile(donation.donorId)">
                    <v-list-item-content>
                        <v-list-item-title>{{ donation.name }}</v-list-item-title>
                        <v-list-item-subtitle>
                            {{ bloodGroups[donation.bloodGroup] }} &middot; {{ formatDate(donation.date) }}
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-card>
    </v-menu>
</template>

<script>
import { handleGETDonationsReportDonors, handleGETPlateletDonationsReportDonors } from '@/api'
import { createNewPopUpWindow } from '@/mixins/helpers'
import { environmentService } from '@/mixins/environment'
import { HTTP_STATUS, bloodGroups } from '@/mixins/constants'

export default {
    name: 'DonationCountCell',
    props: {
        // The number the report table shows for this cell; also the length of the fetched list
        count: { type: Number, required: true },
        // The cell's time window, in the same UTC bounds the report aggregation grouped by
        startDate: { type: Number, required: true },
        endDate: { type: Number, required: true },
        // -1 means the 'Total' column, i.e. every blood group
        bloodGroup: { type: Number, required: true },
        // -1 means the report is being viewed for 'All Halls'
        hall: { type: Number, required: true },
        // Which report the cell belongs to
        donationType: { type: String, default: 'wholeBlood' },
        title: { type: String, default: 'Donors' },
        dataCy: { type: String, default: 'donationCountCell' }
    },
    data () {
        return {
            menu: false,
            loader: false,
            errorHappened: false,
            donations: [],
            bloodGroups
        }
    },
    methods: {
        // Fetched on every open rather than cached: a cell is rarely opened twice, and a
        // stale list after a donation is added elsewhere would be worse than a refetch
        async loadDonors () {
            this.loader = true
            this.errorHappened = false
            const payload = {
                startDate: this.startDate,
                endDate: this.endDate,
                bloodGroup: this.bloodGroup,
                hall: this.hall
            }
            const response = this.donationType === 'platelet'
                ? await handleGETPlateletDonationsReportDonors(payload)
                : await handleGETDonationsReportDonors(payload)
            if (response.status === HTTP_STATUS.OK) {
                this.donations = response.data.donations
            } else {
                this.errorHappened = true
                this.donations = []
            }
            this.loader = false
        },
        // Same profile pop-up the members page opens
        goToDonorProfile (donorId) {
            createNewPopUpWindow(environmentService.getFrontendBaseURL() + '#/home/details?id=' + donorId)
        },
        formatDate (date) {
            return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        }
    }
}
</script>

<style scoped>
.donation-count-cell {
    cursor: pointer;
}
</style>
