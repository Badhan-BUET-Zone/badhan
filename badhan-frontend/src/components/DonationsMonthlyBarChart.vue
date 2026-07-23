<template>
  <div data-cy="monthly-donation-chart">
    <div v-if="!donationCountYearMonthLoader" :key="'barchartKey'">
      <v-btn icon color="primary" @click="populateBefore">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-btn v-if="isRightButtonEnabled" icon color="primary" @click="populateNext">
        <v-icon>mdi-arrow-right</v-icon>
      </v-btn>
      <BarChart
        :options="chartOptions"
        :data="chartData"
      />
    </div>
    <div v-else :key="'loadingKey'">
      <LoadingMessage/>
    </div>
  </div>
</template>

<script>
import { handleGETLogsDonations } from '@/api'
import LoadingMessage from '@/components/LoadingMessage.vue'
import { Bar as BarChart } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, Filler } from 'chart.js'
import localDatabase from '@/localDatabase'
import { HTTP_STATUS } from '@/mixins/constants'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, Filler)

export default {
  name: 'DonationsMonthlyBarChart',
  components: { BarChart, LoadingMessage },
  data () {
    return {
      todayMonth: new Date().getMonth() + 1,
      todayYear: new Date().getFullYear(),

      chartData: {
        labels: [],
        datasets: []
      },
      chartOptions: {
        responsive: true,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Donation Count',
            },
            ticks: {
              stepSize: 1,
              callback: function(value) {
                if (Math.floor(value) === value) {
                  return value;
                }
              },
            }
          }
        }
      },
      rawCountByYearMonth: {},
      currentYear: 0,
      currentMonth: 0,

      donationCountYearMonthLoader: false
    }
  },
  computed: {
    isRightButtonEnabled(){
      return !(this.currentMonth === this.todayMonth && this.currentYear === this.todayYear)
    }
  },
  mounted(){
    this.getDonationStats()
  },
  methods: {
    async populateNext(){
      const date = new Date(this.currentYear, this.currentMonth - 1)
      date.setMonth(date.getMonth() + 6)
      this.currentYear = date.getFullYear()
      this.currentMonth = date.getMonth() + 1
      this.populateSixMonths()
    },
    async populateBefore(){
      let date = new Date(this.currentYear, this.currentMonth - 1)
      date.setMonth(date.getMonth() - 6)
      this.currentYear = date.getFullYear()
      this.currentMonth = date.getMonth() + 1
      this.populateSixMonths()
    },
    async populateSixMonths(){
      const chartData = {
        labels: [],
        datasets: []
      }
      const yearObject = {
        label: `Last 6 Months`,
        data: [],
        borderColor: this.getRandomColor(),
        backgroundColor: this.getRandomColor(0.5),
        fill: 'start'
      }

      for(let i = 5; i >= 0; i--){
        const month = (this.currentMonth - i - 1 + 12) % 12 + 1;
        const year = this.currentYear - (month > this.currentMonth ? 1 : 0)
        yearObject.data.push(this.rawCountByYearMonth[`${year}`]?.[`${month}`]?? 0)
        chartData.labels.push(new Date(year, month - 1).toLocaleString('en-US', { year: '2-digit', month: 'short'}))
      }

      yearObject.label = `${chartData.labels[0]} - ${chartData.labels[chartData.labels.length - 1]}`

      chartData.datasets.push(yearObject)
      this.chartData = chartData
    },
    async getDonationStats(){
      const currentDate = new Date()
      this.currentYear = currentDate.getFullYear()
      this.currentMonth = currentDate.getMonth() + 1

      const resultOfLDB = localDatabase.donationCountYearMonth.load()
      if(resultOfLDB.status == 'ERROR'){
        this.donationCountYearMonthLoader = true
      } else {
        this.rawCountByYearMonth = resultOfLDB.data
        this.populateSixMonths(this.currentYear, this.currentMonth)
      }

      handleGETLogsDonations().then((response)=>{
        if(response.status!==HTTP_STATUS.OK){
          return
        }
        this.rawCountByYearMonth = response.data.countByYearMonth
        localDatabase.donationCountYearMonth.save(this.rawCountByYearMonth)
        this.populateSixMonths(this.currentYear, this.currentMonth)
      }).finally(()=>{
        this.donationCountYearMonthLoader = false
      })
    },
    getRandomColor(transparency=1) {
      let color = 'rgba(';
      for (let i = 0; i < 3; i++) {
        color += Math.floor(Math.random() * 256) + ',';
      }
      color += `${transparency})`
      return color;
    }
  }
}
</script>

<style scoped>

</style>
