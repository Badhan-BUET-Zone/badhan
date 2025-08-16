<template>
    <Container>
        <v-card-title>Donations Report</v-card-title>
        <v-card-text>
            <div class="mt-2">
                <v-menu
                    ref="startDateMenu"
                    v-model="startDateMenu"
                    :close-on-content-click="false"
                    :return-value.sync="startDate"
                    transition="scale-transition"
                    offset-y
                    min-width="auto"
                >
                <template v-slot:activator="{ on, attrs }">
                    <v-text-field rounded v-model="startDate" label="Start Date" prepend-icon="mdi-calendar" readonly outlined v-bind="attrs" v-on="on" dense></v-text-field>
                </template>
                <v-date-picker v-model="startDate" no-title scrollable>
                    <v-spacer></v-spacer>
                    <v-btn text color="primary" @click="startDateMenu = false">Cancel</v-btn>
                    <v-btn text
                        color="primary"
                        @click="$refs.startDateMenu.save(startDate)"
                    >OK
                    </v-btn
                    >
                </v-date-picker>
                </v-menu>
            </div>
            <div class="mt-2">
                <v-menu
                    ref="endDateMenu"
                    v-model="endDateMenu"
                    :close-on-content-click="false"
                    :return-value.sync="endDate"
                    transition="scale-transition"
                    offset-y
                    min-width="auto"
                >
                <template v-slot:activator="{ on, attrs }">
                    <v-text-field rounded v-model="endDate" label="End Date" prepend-icon="mdi-calendar" readonly outlined v-bind="attrs" v-on="on" dense></v-text-field>
                </template>
                <v-date-picker v-model="endDate" no-title scrollable>
                    <v-spacer></v-spacer>
                    <v-btn text color="primary" @click="endDateMenu = false">Cancel</v-btn>
                    <v-btn text
                        color="primary"
                        @click="$refs.endDateMenu.save(endDate)"
                    >OK
                    </v-btn>
                </v-date-picker>
                </v-menu>
            </div>
        </v-card-text>
        <v-card-actions>
            <Button :disabled="disableGenerateReportButton"
            :icon="'mdi-file-chart'"
            :click="generateReport"
            :color="'primary'"
            :text="'Generate Report'"
            ></Button>
        </v-card-actions>
        <transition name="slide-fade-down-snapout" mode="out-in">
            <LoadingMessage v-if="reportLoader" :key="'reportLoader'"/>
            <v-card-text v-else-if="report.length!==0 || plateletReport.length!==0" :key="'donationReportLoaded'">
                <v-card-title class="px-0">Whole Blood Donations</v-card-title>
                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                            <tr>
                                <td v-for="header in headers" :key="header">{{ header }}</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="singleMonth in report" :key="singleMonth.nameOfMonth">
                                <td v-for="(key,index) in Object.keys(singleMonth)" :key="index">{{ singleMonth[key] }}</td>
                            </tr>
                        </tbody>
                    </template>
                </v-simple-table>
                <v-card-text>
                    <p>Count of Donors who Donated for the First Time: {{ firstDonationOfDonorCount }}</p>
                </v-card-text>

                <v-divider class="my-4"></v-divider>

                <v-card-title class="px-0">Platelet Donations</v-card-title>
                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                            <tr>
                                <td v-for="header in headers" :key="'p_'+header">{{ header }}</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="singleMonth in plateletReport" :key="'p_'+singleMonth.nameOfMonth">
                                <td v-for="(key,index) in Object.keys(singleMonth)" :key="'p_'+index">{{ singleMonth[key] }}</td>
                            </tr>
                        </tbody>
                    </template>
                </v-simple-table>
                <v-card-text>
                    <p>Count of Donors who Donated Platelet for the First Time: {{ firstPlateletDonationOfDonorCount }}</p>
                </v-card-text>
            </v-card-text>
            <v-card-text v-else :key="'nothingToShowId'">Nothing to show</v-card-text>
        </transition>
    </Container>
</template>
  
<script>
import Container from '../../components/Wrappers/Container'
import { handleGETDonationsReport, handleGETPlateletDonationsReport } from '@/api'
import LoadingMessage from '@/components/LoadingMessage.vue'
import Button from '@/components/UI Components/Button.vue'
import { bloodGroups, DESIGNATIONS_INDEX } from '@/mixins/constants'
  
export default {
    name: 'DonationsReport',
    components: {
      Container,
      LoadingMessage,
      Button
    },
    data () {
      return {
        report: [],
    plateletReport: [],
        reportLoader: false,
        startDateMenu: false,
        startDate: '',
        endDateMenu: false,
        endDate: '',
        headers: ['Name of Month', ...bloodGroups, 'Total'],
    firstDonationOfDonorCount: 0,
    firstPlateletDonationOfDonorCount: 0
      }
    },
    computed: {
        disableGenerateReportButton(){
            return this.reportLoader || (this.startDate === '' && this.endDate === '')
        }
    },
    methods: {
    async generateReport(){
            const startDate = new Date(this.startDate)
            const endDate = new Date(this.endDate)
            const startTimeStamp = startDate.getTime()
            const endTimeStamp = endDate.getTime()

            this.reportLoader = true
            const response = await handleGETDonationsReport({startDate: startTimeStamp, endDate: endTimeStamp})
            if (response.status !== 200) return

            const reportObject = {}

            response.data.report.forEach(bloodGroupData=>{
                const bloodGroup = bloodGroupData.bloodGroup
                bloodGroupData.counts.forEach(countData=>{
                    const count = countData.count
                    const month = countData.month
                    const year = countData.year
                    if(!Object.hasOwn(reportObject,year)){
                        reportObject[year] = {}
                    }
                    if(!Object.hasOwn(reportObject[year],month)){
                        reportObject[year][month] = {}
                    }
                    reportObject[year][month][bloodGroups[bloodGroup]] = count
                })
            })

            const tableEntries = []
            
            while (startDate <= endDate) {
                const month = startDate.getMonth() + 1
                const year = startDate.getFullYear()
                const singleRow = {}

                singleRow['nameOfMonth'] = `${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
                let totalForMonth = 0
                bloodGroups.forEach(bloodGroup=>{
                    singleRow[bloodGroup] = reportObject[year]?.[month]?.[bloodGroup] ?? 0;
                    totalForMonth += singleRow[bloodGroup]
                })
                singleRow['total'] = totalForMonth
                tableEntries.push(singleRow)
                startDate.setMonth(startDate.getMonth() + 1);
            }

            const lastTotalEntry = {'nameOfMonth': 'Total'}
            let sumTotalDonations = 0
            bloodGroups.forEach(bloodGroup=>{
                let totalForOneBloodGroup = 0
                tableEntries.forEach(entry=>{
                    totalForOneBloodGroup += entry[bloodGroup]
                    sumTotalDonations += entry[bloodGroup]
                })
                lastTotalEntry[bloodGroup] = totalForOneBloodGroup
            })
            lastTotalEntry['total']= sumTotalDonations

            tableEntries.push(lastTotalEntry)

            this.report = tableEntries
            this.firstDonationOfDonorCount = response.data.firstDonationCount

            // Platelet report
            const pResponse = await handleGETPlateletDonationsReport({ startDate: startTimeStamp, endDate: endTimeStamp })
            if (pResponse.status === 200) {
                const pReportObject = {}
                pResponse.data.report.forEach(bloodGroupData => {
                    const bloodGroup = bloodGroupData.bloodGroup
                    bloodGroupData.counts.forEach(countData => {
                        const count = countData.count
                        const month = countData.month
                        const year = countData.year
                        if (!Object.hasOwn(pReportObject, year)) pReportObject[year] = {}
                        if (!Object.hasOwn(pReportObject[year], month)) pReportObject[year][month] = {}
                        pReportObject[year][month][bloodGroups[bloodGroup]] = count
                    })
                })

                const pTableEntries = []
                const ps = new Date(this.startDate)
                const pe = new Date(this.endDate)
                while (ps <= pe) {
                    const month = ps.getMonth() + 1
                    const year = ps.getFullYear()
                    const row = {}
                    row['nameOfMonth'] = `${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
                    let totalForMonth = 0
                    bloodGroups.forEach(bg => {
                        row[bg] = pReportObject[year]?.[month]?.[bg] ?? 0
                        totalForMonth += row[bg]
                    })
                    row['total'] = totalForMonth
                    pTableEntries.push(row)
                    ps.setMonth(ps.getMonth() + 1)
                }

                const plastTotalEntry = { 'nameOfMonth': 'Total' }
                let psumTotal = 0
                bloodGroups.forEach(bg => {
                    let subtotal = 0
                    pTableEntries.forEach(entry => {
                        subtotal += entry[bg]
                        psumTotal += entry[bg]
                    })
                    plastTotalEntry[bg] = subtotal
                })
                plastTotalEntry['total'] = psumTotal
                pTableEntries.push(plastTotalEntry)
                this.plateletReport = pTableEntries
                this.firstPlateletDonationOfDonorCount = pResponse.data.firstPlateletDonationCount
            } else {
                this.plateletReport = []
                this.firstPlateletDonationOfDonorCount = 0
            }

            this.reportLoader = false
        },
        setDates(){
            const today = new Date();
            let dd = String(today.getDate()).padStart(2, '0');
            let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            let yyyy = today.getFullYear();

            this.endDate = yyyy + '-' + mm + '-' + dd;

            // Get the date three months ago
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            dd = String(threeMonthsAgo.getDate()).padStart(2, '0');
            mm = String(threeMonthsAgo.getMonth() + 1).padStart(2, '0'); //January is 0!
            yyyy = threeMonthsAgo.getFullYear();

            this.startDate = yyyy + '-' + mm + '-' + dd;
        }
    },
    async mounted () {
        if (this.$store.getters['getDesignation'] !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
            this.$router.push({ name: 'NotFound' })
            return
        }
        this.setDates()
        await this.generateReport()
    }
}
</script>
  
<style scoped>
  
</style>