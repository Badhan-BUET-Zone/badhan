<template>
    <Container>
        <ActivitySummary />
        <v-divider class="my-4"></v-divider>
        <v-card-title>Donations Report</v-card-title>
        <v-card-text>
            <DonationsMonthlyBarChart />
        </v-card-text>
        <v-card-title>Generate Donation Report By Date</v-card-title>
        <v-card-text>
            <div class="mt-2">
                <DatePicker v-model="startDate" label="Start Date" textFieldId="startDatePicker" />
            </div>
            <div class="mt-2">
                <DatePicker v-model="endDate" label="End Date" textFieldId="endDatePicker" />
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
                <v-card-title class="px-0" data-cy="totalDonationsByHallTitle">Total Donations by Hall <span class="text-subtitle-2 grey--text ml-2">{{ dateRangeText }}</span></v-card-title>
                <div data-cy="hall-donation-chart" style="position: relative; height: 320px;">
                    <BarChart :options="hallChartOptions" :data="hallChartData" />
                </div>

                <v-divider class="my-4"></v-divider>

                <v-card-title class="px-0" data-cy="totalDonationsByBloodGroupTitle">Total Donations by Blood Group <span class="text-subtitle-2 grey--text ml-2">{{ dateRangeText }}</span></v-card-title>
                <div data-cy="blood-group-donation-chart" style="position: relative; height: 320px;">
                    <BarChart :options="bloodGroupChartOptions" :data="bloodGroupChartData" />
                </div>

                <v-divider class="my-4"></v-divider>

                <div class="mt-2">
                    <Selector id="reportHallDropdownId" data-cy="report-hall-select"
                        v-model="selectedHall" :items="hallOptions" label="Select Hall" />
                </div>

                <v-card-title class="px-0" data-cy="wholeBloodDonationsTitle">Whole Blood Donations <span class="text-subtitle-2 grey--text ml-2">{{ dateRangeText }}</span></v-card-title>
                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                            <tr>
                                <td v-for="header in headers" :key="header">{{ header }}</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="singleMonth in report" :key="singleMonth.nameOfMonth" data-cy="wholeBloodRow">
                                <td>{{ singleMonth.nameOfMonth }}</td>
                                <td v-for="(bloodGroup, index) in bloodGroups" :key="index">
                                    <DonationCountCell :count="singleMonth[bloodGroup]"
                                        :startDate="singleMonth.startTimestamp" :endDate="singleMonth.endTimestamp"
                                        :bloodGroup="index" :hall="selectedHallIndex" :donationType="'wholeBlood'"
                                        :title="`${bloodGroup} whole blood donors, ${singleMonth.nameOfMonth}`"
                                        :dataCy="'wholeBloodCell'" />
                                </td>
                                <td>
                                    <DonationCountCell :count="singleMonth.total"
                                        :startDate="singleMonth.startTimestamp" :endDate="singleMonth.endTimestamp"
                                        :bloodGroup="BLOOD_GROUP_ANY" :hall="selectedHallIndex" :donationType="'wholeBlood'"
                                        :title="`Whole blood donors, ${singleMonth.nameOfMonth}`"
                                        :dataCy="'wholeBloodTotalCell'" />
                                </td>
                            </tr>
                        </tbody>
                    </template>
                </v-simple-table>
                <v-card-text>
                    <p>Count of Donors who Donated for the First Time <span class="grey--text">{{ dateRangeText }}</span>: {{ firstDonationOfDonorCount }}</p>
                </v-card-text>

                <v-divider class="my-4"></v-divider>

                <v-card-title class="px-0" data-cy="plateletDonationsTitle">Platelet Donations <span class="text-subtitle-2 grey--text ml-2">{{ dateRangeText }}</span></v-card-title>
                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                            <tr>
                                <td v-for="header in headers" :key="'p_'+header">{{ header }}</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="singleMonth in plateletReport" :key="'p_'+singleMonth.nameOfMonth" data-cy="plateletRow">
                                <td>{{ singleMonth.nameOfMonth }}</td>
                                <td v-for="(bloodGroup, index) in bloodGroups" :key="'p_'+index">
                                    <DonationCountCell :count="singleMonth[bloodGroup]"
                                        :startDate="singleMonth.startTimestamp" :endDate="singleMonth.endTimestamp"
                                        :bloodGroup="index" :hall="selectedHallIndex" :donationType="'platelet'"
                                        :title="`${bloodGroup} platelet donors, ${singleMonth.nameOfMonth}`"
                                        :dataCy="'plateletCell'" />
                                </td>
                                <td>
                                    <DonationCountCell :count="singleMonth.total"
                                        :startDate="singleMonth.startTimestamp" :endDate="singleMonth.endTimestamp"
                                        :bloodGroup="BLOOD_GROUP_ANY" :hall="selectedHallIndex" :donationType="'platelet'"
                                        :title="`Platelet donors, ${singleMonth.nameOfMonth}`"
                                        :dataCy="'plateletTotalCell'" />
                                </td>
                            </tr>
                        </tbody>
                    </template>
                </v-simple-table>
                <v-card-text>
                    <p>Count of Donors who Donated Platelet for the First Time <span class="grey--text">{{ dateRangeText }}</span>: {{ firstPlateletDonationOfDonorCount }}</p>
                </v-card-text>
            </v-card-text>
            <v-card-text v-else :key="'nothingToShowId'">Nothing to show</v-card-text>
        </transition>
    </Container>
</template>
  
<script>
import Container from '@/components/Container/Container'
import { handleGETDonationsReport, handleGETPlateletDonationsReport } from '@/api'
import LoadingMessage from '@/components/LoadingMessage.vue'
import Button from '@/components/UI Components/Button.vue'
import DatePicker from '@/components/UI Components/DatePicker.vue'
import Selector from '@/components/UI Components/Selector.vue'
import DonationsMonthlyBarChart from '@/components/DonationsMonthlyBarChart.vue'
import ActivitySummary from '@/components/ActivitySummary.vue'
import DonationCountCell from '@/views/Statistics/components/DonationCountCell.vue'
import { Bar as BarChart } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { DESIGNATIONS_INDEX, HTTP_STATUS, bloodGroups, halls, HALLS_INDEX, BLOOD_GROUP_ANY, HALL_ANY } from '@/mixins/constants'

ChartJS.register(Title, Tooltip, BarElement, CategoryScale, LinearScale)

const ALL_HALLS = 'All Halls'
// Brand red (Vuetify colors.red.darken3) — single series, so one hue
const BAR_COLOR = '#C62828'

export default {
    name: 'DonationsReport',
    components: {
      Container,
      LoadingMessage,
      Button,
      DatePicker,
      Selector,
      BarChart,
      DonationsMonthlyBarChart,
      ActivitySummary,
      DonationCountCell
    },
    data () {
      return {
        report: [],
    plateletReport: [],
        reportLoader: false,
        startDate: '',
        endDate: '',
        selectedHall: ALL_HALLS,
        // The date range that produced the currently shown report (for the titles)
        reportStartDate: '',
        reportEndDate: '',
        // The same range as timestamps — the bounds the cells drill down within
        reportStartTimestamp: 0,
        reportEndTimestamp: 0,
        // Full API responses cached so the hall dropdown can switch views without refetching
        wholeBloodData: null,
        plateletData: null,
        headers: ['Name of Month', ...bloodGroups, 'Total'],
        bloodGroups,
        BLOOD_GROUP_ANY,
    firstDonationOfDonorCount: 0,
    firstPlateletDonationOfDonorCount: 0,
      }
    },
    computed: {
        disableGenerateReportButton(){
            return this.reportLoader || (this.startDate === '' && this.endDate === '')
        },
        hallOptions(){
            // 'All Halls' sentinel first, then every donor-assignable hall (excludes 'Attached')
            return [ALL_HALLS, ...halls.filter((_, index) => index !== HALLS_INDEX.ATTACHED)]
        },
        // The hall the cells drill down into: HALL_ANY when the whole report is shown
        selectedHallIndex(){
            return this.selectedHall === ALL_HALLS ? HALL_ANY : halls.indexOf(this.selectedHall)
        },
        // Range of the currently shown report, e.g. "(23 Jul 2026 - 23 Oct 2026)"
        dateRangeText(){
            if (!this.reportStartDate || !this.reportEndDate) return ''
            const format = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
            return `(${format(this.reportStartDate)} - ${format(this.reportEndDate)})`
        },
        // Per-hall total = whole blood + platelet donations, computed from the cached hallwise data
        hallChartData(){
            const hallNames = this.hallOptions.slice(1) // drop 'All Halls'
            const sorted = hallNames
                .map(name => {
                    const hallIndex = halls.indexOf(name)
                    return { name, total: this.sumHallTotal(this.wholeBloodData, hallIndex) + this.sumHallTotal(this.plateletData, hallIndex) }
                })
                .sort((a, b) => b.total - a.total) // high to low
            return {
                labels: sorted.map(h => h.name),
                datasets: [{
                    label: 'Total Donations',
                    backgroundColor: BAR_COLOR,
                    borderRadius: 4,
                    data: sorted.map(h => h.total)
                }]
            }
        },
        hallChartOptions(){
            return this.barChartOptions()
        },
        // Per-blood-group total = whole blood + platelet across all halls, from the cached reports
        bloodGroupChartData(){
            const sorted = bloodGroups
                .map((name, bloodGroupIndex) => ({
                    name,
                    total: this.sumBloodGroupTotal(this.wholeBloodData, bloodGroupIndex) + this.sumBloodGroupTotal(this.plateletData, bloodGroupIndex)
                }))
                .sort((a, b) => b.total - a.total) // high to low
            return {
                labels: sorted.map(g => g.name),
                datasets: [{
                    label: 'Total Donations',
                    backgroundColor: BAR_COLOR,
                    borderRadius: 4,
                    data: sorted.map(g => g.total)
                }]
            }
        },
        bloodGroupChartOptions(){
            return this.barChartOptions()
        }
    },
    watch: {
        // Switch the displayed hall from cached data without hitting the API again
        selectedHall(){
            if (this.wholeBloodData || this.plateletData) this.renderSelectedHall()
        },
        // A changed date range invalidates the shown report until 'Generate Report' is pressed again
        startDate(){
            this.clearReport()
        },
        endDate(){
            this.clearReport()
        }
    },
    methods: {
        // Shared options for the single-series total-donation bar charts (integer y-axis, no legend)
        barChartOptions(){
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false } // single series — title names it
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Total Donations (Whole Blood + Platelet)' },
                        ticks: {
                            stepSize: 1,
                            callback: (value) => (Math.floor(value) === value ? value : undefined)
                        }
                    }
                }
            }
        },
        // Sums every donation count across blood groups and months for one hall in a cached response
        sumHallTotal(data, hallIndex){
            const entry = data?.hallwiseReport?.[hallIndex]
            if (!entry) return 0
            let total = 0
            entry.report.forEach(bloodGroupData => {
                bloodGroupData.counts.forEach(countData => { total += countData.count })
            })
            return total
        },
        // Sums every donation count across months for one blood group across all halls
        sumBloodGroupTotal(data, bloodGroupIndex){
            if (!data?.report) return 0
            let total = 0
            data.report.forEach(bloodGroupData => {
                if (bloodGroupData.bloodGroup === bloodGroupIndex) {
                    bloodGroupData.counts.forEach(countData => { total += countData.count })
                }
            })
            return total
        },
        // Hides the currently shown report by dropping both the display tables and the cache
        clearReport(){
            this.report = []
            this.plateletReport = []
            this.wholeBloodData = null
            this.plateletData = null
            this.firstDonationOfDonorCount = 0
            this.firstPlateletDonationOfDonorCount = 0
            this.reportStartDate = ''
            this.reportEndDate = ''
            this.reportStartTimestamp = 0
            this.reportEndTimestamp = 0
        },
    async generateReport(){
            const startDate = this.startDate
            const endDate = this.endDate
            const startTimeStamp = new Date(startDate).getTime()
            const endTimeStamp = new Date(endDate).getTime()

            this.reportLoader = true

            const response = await handleGETDonationsReport({startDate: startTimeStamp, endDate: endTimeStamp})
            this.wholeBloodData = response.status === HTTP_STATUS.OK ? response.data : null

            const pResponse = await handleGETPlateletDonationsReport({ startDate: startTimeStamp, endDate: endTimeStamp })
            this.plateletData = pResponse.status === HTTP_STATUS.OK ? pResponse.data : null

            // Set the range AFTER the awaits: a date-change watcher (e.g. from setDates on
            // mount) fires clearReport during the fetch and would otherwise wipe these
            this.reportStartDate = startDate
            this.reportEndDate = endDate
            this.reportStartTimestamp = startTimeStamp
            this.reportEndTimestamp = endTimeStamp

            this.renderSelectedHall()
            this.reportLoader = false
        },
        // Builds the monthly table rows (plus a Total row) from a [{bloodGroup, counts:[{month,year,count}]}] array
        buildTable(reportArray){
            const reportObject = {}
            reportArray.forEach(bloodGroupData => {
                const bloodGroup = bloodGroupData.bloodGroup
                bloodGroupData.counts.forEach(countData => {
                    const { count, month, year } = countData
                    if (!Object.hasOwn(reportObject, year)) reportObject[year] = {}
                    if (!Object.hasOwn(reportObject[year], month)) reportObject[year][month] = {}
                    reportObject[year][month][bloodGroups[bloodGroup]] = count
                })
            })

            const tableEntries = []
            const cursor = new Date(this.startDate)
            const end = new Date(this.endDate)
            while (cursor <= end) {
                const month = cursor.getMonth() + 1
                const year = cursor.getFullYear()
                const singleRow = {}
                singleRow['nameOfMonth'] = `${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
                let totalForMonth = 0
                bloodGroups.forEach(bloodGroup => {
                    singleRow[bloodGroup] = reportObject[year]?.[month]?.[bloodGroup] ?? 0
                    totalForMonth += singleRow[bloodGroup]
                })
                singleRow['total'] = totalForMonth
                // The window this row's cells drill down into. The backend groups months in
                // UTC, so the month bounds are UTC too — and they are clipped to the report
                // range, since a partial first/last month only counted donations inside it
                Object.assign(singleRow, this.monthWindow(year, month))
                tableEntries.push(singleRow)
                cursor.setMonth(cursor.getMonth() + 1)
            }

            const lastTotalEntry = { 'nameOfMonth': 'Total' }
            let sumTotalDonations = 0
            bloodGroups.forEach(bloodGroup => {
                let totalForOneBloodGroup = 0
                tableEntries.forEach(entry => {
                    totalForOneBloodGroup += entry[bloodGroup]
                    sumTotalDonations += entry[bloodGroup]
                })
                lastTotalEntry[bloodGroup] = totalForOneBloodGroup
            })
            lastTotalEntry['total'] = sumTotalDonations
            // The Total row spans the whole report range
            lastTotalEntry['startTimestamp'] = this.reportStartTimestamp
            lastTotalEntry['endTimestamp'] = this.reportEndTimestamp
            tableEntries.push(lastTotalEntry)

            return tableEntries
        },
        // UTC bounds of one month of the table, clipped to the report range so a cell's
        // drill-down returns exactly the donations that cell counted
        monthWindow(year, month){
            const monthStart = Date.UTC(year, month - 1, 1)
            const monthEnd = Date.UTC(year, month, 1)
            return {
                startTimestamp: Math.max(monthStart, this.reportStartTimestamp),
                endTimestamp: Math.min(monthEnd, this.reportEndTimestamp)
            }
        },
        // Renders both tables from cached data for the currently selected hall (no refetch)
        renderSelectedHall(){
            // 'All Halls' uses the top-level report; otherwise pick the hall's slice from hallwiseReport
            const hallIndex = this.selectedHall === ALL_HALLS ? null : halls.indexOf(this.selectedHall)

            if (this.wholeBloodData) {
                const source = hallIndex === null
                    ? { report: this.wholeBloodData.report, firstDonationCount: this.wholeBloodData.firstDonationCount }
                    : (this.wholeBloodData.hallwiseReport?.[hallIndex] ?? { report: [], firstDonationCount: 0 })
                this.report = this.buildTable(source.report)
                this.firstDonationOfDonorCount = source.firstDonationCount
            } else {
                this.report = []
                this.firstDonationOfDonorCount = 0
            }

            if (this.plateletData) {
                const pSource = hallIndex === null
                    ? { report: this.plateletData.report, firstPlateletDonationCount: this.plateletData.firstPlateletDonationCount }
                    : (this.plateletData.hallwiseReport?.[hallIndex] ?? { report: [], firstPlateletDonationCount: 0 })
                this.plateletReport = this.buildTable(pSource.report)
                this.firstPlateletDonationOfDonorCount = pSource.firstPlateletDonationCount
            } else {
                this.plateletReport = []
                this.firstPlateletDonationOfDonorCount = 0
            }
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