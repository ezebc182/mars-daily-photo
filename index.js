require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const cron = require('node-cron');


const BASE_URL = 'https://api.nasa.gov/mars-photos/api/v1/rovers';

const CAMERA_TYPES = {
    'FHAZ': 'Fron Hazard Avoidance Camera',
    'RHAZ': 'Rear Hazard Avoidance Camera',
    'MAST': 'Mast Camera',
    'CHEMCAM': 'Chemistry and Camera Complex',
    'MAHLI': 'Mars Hand Lens Imager',
    'MARDI': 'Mars Descent Imager',
    'NAVCAM': 'Navigation Camera'
};

const getTodayDateString = () => {
    const date = new Date();
    return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate() - 1}`;
};

const getMarsImages = async () => {
    const reqURL = `${BASE_URL}/curiosity/photos?earth_date=${getTodayDateString()}&api_key=${process.env.NASA_API_KEY}`;
    const photos = (await axios.get(reqURL)).data.photos;
    const groupedPhotos = photos.reduce((acc, imgObj) => {
        if (Array.isArray(acc[imgObj.camera.name])) acc[imgObj.camera.name].push(imgObj.camera.name);
        else acc[imgObj.camera.name] = [imgObj.img_src];

        return acc;
    }, {});

    return groupedPhotos;

};

const generateEmail = (imgURLs) => {
    return `
        <h1>Images from the Curiosity Mars Rover for ${getTodayDateString()}</h1>
        ${Object.keys(imgURLs).reduce((htmlStr, type) => {
        htmlStr += `
            <h3>${CAMERA_TYPES[type]} Image</h3>
            <img src=${imgURLs[type][0]} />
        `;
        return htmlStr;
    }, '')}
    `;
};

const executeJob = async () => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        posrt: 587,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        const imgURLs = await getMarsImages();
        const emailTemplate = generateEmail(imgURLs);

        const sendEmailRes = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.RECIPIENT_ADDR,
            subject: 'Mars Pictures of the Day from the Curiosity Rover',
            html: emailTemplate,

        });

        console.log('Message sent: ', sendEmailRes.messageId);
    } catch (error) {
        console.error(error);
    }
};

cron.schedule('0 23 * * *', async () => {
    try {
        await executeJob();
    } catch (error) {
        console.error(error);
    }
})

