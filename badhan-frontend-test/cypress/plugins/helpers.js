export const idStart = (elementId) => {
    return `[id^="${elementId}"]`
}

export const getLastDateThatIsNotToday = () => {
    const currentMonth = new Date().getMonth()
    const lastDateObject = new Date(2008, currentMonth + 1, 0)
    const lastDateOfCurrentMonth = lastDateObject.getDate()

    const todayDate = new Date().getDate()

    return lastDateOfCurrentMonth === todayDate? lastDateOfCurrentMonth - 1: lastDateOfCurrentMonth

}
