const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());

async function getFacebookPosts(accessToken, pageId) {
    try {
        let allPosts = [];
        let nextPageUrl = `https://graph.facebook.com/v18.0/${pageId}/posts`;
        
        // Keep fetching posts while there are more pages
        while (nextPageUrl) {
            console.log('Fetching page of posts...');
            const response = await axios.get(nextPageUrl, {
                params: {
                    access_token: accessToken,
                    limit: 100, // Maximum posts per request
                    fields: 'id,message,created_time,shares,likes.summary(true),comments.summary(true),attachments{media,media_type,type,url,subattachments}'
                }
            });
            
            // Process posts to extract media URLs
            const posts = response.data.data.map(post => {
                const mediaUrls = [];
                if (post.attachments && post.attachments.data) {
                    post.attachments.data.forEach(attachment => {
                        // Handle main attachment
                        if (attachment.media && attachment.media.image) {
                            mediaUrls.push({
                                type: attachment.type,
                                media_type: attachment.media_type,
                                url: attachment.media.image.src
                            });
                        }
                        // Handle subattachments (like album photos)
                        if (attachment.subattachments && attachment.subattachments.data) {
                            attachment.subattachments.data.forEach(subattachment => {
                                if (subattachment.media && subattachment.media.image) {
                                    mediaUrls.push({
                                        type: subattachment.type,
                                        media_type: subattachment.media_type,
                                        url: subattachment.media.image.src
                                    });
                                }
                            });
                        }
                    });
                }
                
                // Return post with media URLs
                return {
                    ...post,
                    media: mediaUrls
                };
            });
            
            allPosts = [...allPosts, ...posts];
            
            // Check if there's a next page
            nextPageUrl = response.data.paging && response.data.paging.next ? response.data.paging.next : null;
            
            // Log progress
            console.log(`Fetched ${allPosts.length} posts so far...`);
        }
        
        return allPosts;
    } catch (error) {
        console.error('Error fetching Facebook posts:', error.message);
        throw error;
    }
}

async function sendToWebhook(data, webhookUrl) {
    try {
        const urlToUse = webhookUrl || process.env.WEBHOOK_URL;
        if (!urlToUse) {
            throw new Error('No webhook URL provided (neither request body nor .env)');
        }
        await axios.post(urlToUse, data);
        console.log('Data successfully sent to webhook:', urlToUse);
    } catch (error) {
        console.error('Error sending data to webhook:', error.message);
        throw error;
    }
}

// API endpoint for scraping
app.post('/scrape', async (req, res) => {
    const { accessToken, pageId, webhookUrl, sendIndividually } = req.body;

    if (!accessToken || !pageId) {
        return res.status(400).json({ error: 'Access token and Page ID are required' });
    }

    try {
        console.log('Fetching Facebook posts...');
        const posts = await getFacebookPosts(accessToken, pageId);
        
        console.log('Sending data to webhook...');
        // Build base metadata
        const scrapedAt = new Date().toISOString();
        // Helper to extract the simplified fields
        function simplifyPost(p, pageId) {
            const message = p.message || '';
            const post_id = p.id || null;
            // media was previously attached as array of {url,...}
            let media_url = null;
            if (p.media && Array.isArray(p.media) && p.media.length > 0) {
                media_url = p.media[0].url || null;
            }

            // Build a best-effort post URL
            let post_url = null;
            if (post_id) {
                if (post_id.includes('_')) {
                    const parts = post_id.split('_');
                    const story_fbid = parts.pop();
                    const page = parts.join('_') || pageId || '';
                    if (page) {
                        post_url = `https://www.facebook.com/${page}/posts/${story_fbid}`;
                    } else {
                        post_url = `https://www.facebook.com/${post_id}`;
                    }
                } else if (pageId) {
                    post_url = `https://www.facebook.com/${pageId}/posts/${post_id}`;
                } else {
                    post_url = `https://www.facebook.com/${post_id}`;
                }
            }

            return { message, post_id, media_url, post_url };
        }

        // For bulk payload send only the variables messageN, post_idN and mediaurlN
        // Build arrays for messages, media_url and post_id (no numbered variable names)
        const messages = [];
        const media_urls = [];
        const post_ids = [];
        const post_urls = [];
        for (let i = 0; i < posts.length; i++) {
            const s = simplifyPost(posts[i], pageId);
            messages.push(s.message);
            media_urls.push(s.media_url);
            post_ids.push(s.post_id);
            post_urls.push(s.post_url);
        }
        const data = {
            message: messages,
            media_url: media_urls,
            post_id: post_ids,
            post_url: post_urls
        };
        
        // Validate webhook URL if provided
        if (webhookUrl) {
            try {
                // basic validation
                const parsed = new URL(webhookUrl);
                if (!/^https?:$/.test(parsed.protocol)) {
                    return res.status(400).json({ error: 'Webhook URL must use http or https' });
                }
            } catch (err) {
                return res.status(400).json({ error: 'Invalid webhook URL' });
            }
        }

        if (sendIndividually) {
            // Send each post separately with ONLY { message, post_id, mediaurl }
            let successCount = 0;
            const failures = [];
            for (let i = 0; i < posts.length; i++) {
                const s = simplifyPost(posts[i]);
                const singlePayload = {
                    message: s.message,
                    post_id: s.post_id,
                    media_url: s.media_url,
                    post_url: s.post_url
                };
                try {
                    await sendToWebhook(singlePayload, webhookUrl);
                    successCount++;
                } catch (err) {
                    failures.push({ index: i, id: posts[i].id, error: err.message });
                }
            }

            return res.json({
                success: failures.length === 0,
                totalPosts: posts.length,
                sent: successCount,
                failed: failures.length,
                failures: failures
            });
        } else {
            // single bulk payload uses numbered triplets (messageN, post_idN, mediaurlN)
            await sendToWebhook(data, webhookUrl);

            return res.json({ 
                success: true,
                totalPosts: posts.length,
                message: `Successfully scraped and sent ${posts.length} posts to webhook`
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});