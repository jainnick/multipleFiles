const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());

const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
const pageId = process.env.PAGE_ID;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.post('/post-to-facebook', async (req, res) => {
  try {
    const message = req.body.message;
    const mediaType = req.body.mediaType; // 'photo', 'video', 'gif', 'message'
    const mediaItems = req.body.mediaItems; // Array of media objects

    if (mediaType === 'photo') {
      const formData = new FormData();

      // Add the access token and message
      formData.append('access_token', pageAccessToken);
      formData.append('message', message);

      // Add each photo to the form data
      mediaItems.forEach((mediaItem, index) => {
        const fieldName = `file${index + 1}`;
        const fullPath = path.join(__dirname, mediaItem.mediaPath);

        if (!fs.existsSync(fullPath)) {
          return res.status(400).json({ error: `Media file not found: ${mediaItem.mediaPath}` });
        }

        formData.append(fieldName, fs.createReadStream(fullPath));
      });

      // Make the API request to post the photos
      const response = await axios.post(`https://graph.facebook.com/v12.0/${pageId}/photos`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      res.json({ post_id: response.data.id });
    } else if (mediaType === 'message') {
      // If media type is 'message', post only the message content
      const apiUrl = `https://graph.facebook.com/v12.0/${pageId}/feed`;

      const postData = {
        message: message,
        access_token: pageAccessToken,
      };

      const response = await axios.post(apiUrl, postData);

      res.json({ post_id: response.data.id });
    } else {
      return res.status(400).json({ error: 'Invalid media type' });
    }
  } catch (error) {
    console.error('Error:', error);
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  }
});
