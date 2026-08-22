import nodemailer from "nodemailer"

import type { EmailDelivery } from "./auth.ts"

type SmtpConfiguration = {
  from: string
  host: string
  port: number
  secure: boolean
}

export function createSmtpEmailDelivery(configuration: SmtpConfiguration): EmailDelivery {
  const transport = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
  })
  return {
    async send(message) {
      await transport.sendMail({
        from: configuration.from,
        subject: message.subject,
        text: message.text,
        to: message.to,
      })
    },
  }
}
