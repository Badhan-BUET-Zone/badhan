export const checkEmail: (param: string) => boolean = (email: string): boolean => {
  const emailRegex:RegExp = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/
  return emailRegex.test(email)
}
