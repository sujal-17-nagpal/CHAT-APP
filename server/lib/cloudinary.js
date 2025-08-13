import {v2 as cloudinary} from 'cloudinary'

cloudinary.config({
    cloud_name:process.env.CLUOUDINARY_CLOUD_NAME,
    api_key:process.env.CLUOUDINARY_API_KEY,
    api_secret:process.env.CLUOUDINARY_API_SECRET
})

export default cloudinary