export const checkEmail = (email: string) => {
  const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/
  return emailRegex.test(email)
}
