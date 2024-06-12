import nodemailer from "nodemailer";

export const emailRegistro = async (datos) => {
    const { email, nombre, token, telefono } = datos;

    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    //info de email
    const info = await transport.sendMail({
        from: '"Waras" <cuentas@warasdelivery.com>',
        to: email,
        subject: "Waras app - Confirma tu cuenta",
        text: "Confirma tu cuenta en la plataforma waras",
        html: `
        <h1>Waras delivery - Confirmacion de cuentas</h1>
        <p>Hola: ${nombre}, confirma tu cuenta waras</p>
        <p>Tu cuenta ya esta casi lista, solo debes comprobarla en el siguiente enlace:
            <a href="${process.env.FRONTEND_URL}/confirmar/${token}">Confirmar mi cuenta</a>
        </p>

        <p>Si tu no creaste esta cuenta, solo ignora el mensaje</p>
        
        `,
    });
};

export const emailRegistroMoto = async (datos) => {
    const { email, nombre, token, telefono } = datos;

    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    //info de email
    const info = await transport.sendMail({
        from: '"Waras" <cuentas@warasdelivery.com>',
        to: email,
        subject: "Waras app - Confirma tu cuenta",
        text: "Confirma tu cuenta en la plataforma waras",
        html: `
        <h1>Waras delivery - Confirmacion de cuentas</h1>
        <p>Hola: ${nombre}, confirma tu cuenta waras</p>
        <p>Tu cuenta ya esta casi lista, solo debes comprobarla en el siguiente enlace:
            <a href="${process.env.FRONTEND_URL_MOTO}/confirmar/${token}">Confirmar mi cuenta</a>
        </p>

        <p>Si tu no creaste esta cuenta, solo ignora el mensaje</p>
        
        `,
    });
};

export const emailRegistroSocio = async (datos) => {
    const { email, nombre, token, telefono } = datos;

    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    //info de email
    const info = await transport.sendMail({
        from: '"Waras" <cuentas@warasdelivery.com>',
        to: email,
        subject: "Waras app - Confirma tu cuenta",
        text: "Confirma tu cuenta en la plataforma waras",
        html: `
        <h1>Waras delivery - Confirmacion de cuentas</h1>
        <p>Hola: ${nombre}, confirma tu cuenta waras</p>
        <p>Tu cuenta ya esta casi lista, solo debes comprobarla en el siguiente enlace:
            <a href="${process.env.FRONTEND_URL_SOCIO}/confirmar/${token}">Confirmar mi cuenta</a>
        </p>

        <p>Si tu no creaste esta cuenta, solo ignora el mensaje</p>
        
        `,
    });
};

export const emailOlvidePassword = async (datos) => {
    const { email, nombre, token, telefono } = datos;


    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    //info de email
    const info = await transport.sendMail({
        from: '"Waras" <cuentas@warasdelivery.com>',
        to: email,
        subject: "Waras app - Reestablece tu password",
        text: "Reestablece el password de tu cuenta en la plataforma waras",
        html: `
        <h1>Waras delivery - Resetear password</h1>
        <p>Hola: ${nombre}, reestablece el password de tu cuenta waras</p>
        <p>El reestablecimiento de tu password ya esta lista, solo debes entrar en el siguiente enlace:
            <a href="${process.env.FRONTEND_URL}/olvide-password/${token}">Reestablecer password</a>
        </p>

        <p>Si tu no solicitaste el reestablecimiento de tu password, solo ignora el mensaje</p>
        
        `,
    });
};

export const emailOlvidePasswordMoto = async (datos) => {
    const { email, nombre, token, telefono } = datos;


    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    //info de email
    const info = await transport.sendMail({
        from: '"Waras" <cuentas@warasdelivery.com>',
        to: email,
        subject: "Waras app - Reestablece tu password",
        text: "Reestablece el password de tu cuenta en la plataforma waras",
        html: `
        <h1>Waras delivery - Resetear password</h1>
        <p>Hola: ${nombre}, reestablece el password de tu cuenta waras</p>
        <p>El reestablecimiento de tu password ya esta lista, solo debes entrar en el siguiente enlace:
            <a href="${process.env.FRONTEND_URL_MOTO}/olvide-password/${token}">Reestablecer password</a>
        </p>

        <p>Si tu no solicitaste el reestablecimiento de tu password, solo ignora el mensaje</p>
        
        `,
    });
};

export const emailOlvidePasswordSocio = async (datos) => {
    const { email, nombre, token, telefono } = datos;


    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    //info de email
    const info = await transport.sendMail({
        from: '"Waras" <cuentas@warasdelivery.com>',
        to: email,
        subject: "Waras app - Reestablece tu password",
        text: "Reestablece el password de tu cuenta en la plataforma waras",
        html: `
        <h1>Waras delivery - Resetear password</h1>
        <p>Hola: ${nombre}, reestablece el password de tu cuenta waras</p>
        <p>El reestablecimiento de tu password ya esta lista, solo debes entrar en el siguiente enlace:
            <a href="${process.env.FRONTEND_URL_SOCIO}/olvide-password/${token}">Reestablecer password</a>
        </p>

        <p>Si tu no solicitaste el reestablecimiento de tu password, solo ignora este mensaje</p>
        
        `,
    });
};
