'use strict';
const AWS = require('aws-sdk');
const path = require('path');
const dotenv = require('dotenv');

const s3 = new AWS.S3();
const elastictranscoder = new AWS.ElasticTranscoder();

module.exports.compress = async (event) => {
    console.log("Received event: " + JSON.stringify(event));

    try {
        const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        const filePath = key.split('.')[0]; // filename without extension
        const filename = filePath.replace("temp/", "");
        const basePath = 'multimedia/' + filename + '/';
        const extension = path.extname(key);

        let params;
        if (key.endsWith('.mp4') || key.endsWith('.mkv') || key.endsWith('.avi') || key.endsWith('.m4a')) {
            // Video file
            params = {
                PipelineId: process.env.PIPELINE_ID,
                Input: {
                    Key: key
                },
                Outputs: [
                    {
                        Key: basePath + `media-1${extension}`, // Adjust the output file extension and name as needed
                        ThumbnailPattern: basePath + 'thumbnail-{count}',
                        PresetId: process.env.PRESENT_ID_1080P // Generic 1080p
                    }
                ]
            };
        } else if (key.endsWith('.mp3') || key.endsWith('.wav')) {
            // Audio file
            params = {
                PipelineId: process.env.PIPELINE_ID,
                Input: {
                    Key: key
                },
                Outputs: [
                    {
                        Key: basePath + `media-1${extension}`, // Adjust the output file extension and name as needed
                        PresetId: process.env.PRESENT_ID_AUDIO // Specify the appropriate audio preset
                    }
                ]
            };
        } else {
            console.log("Unsupported file format:", key);
            return {
                statusCode: 400,
                body: JSON.stringify('Unsupported file format.'),
            };
        }

        console.log("Start time=" + new Date().toISOString());
        const data = await elastictranscoder.createJob(params).promise();
        console.log("Job created:", data);
        const jobId = data.Job.Id;

        // Wait for the job to complete
        await elastictranscoder.waitFor('jobComplete', { Id: jobId }).promise();
        const endTime = new Date().toISOString();
        console.log("end time=" + endTime);

        // Wait for the job to complete with retry logic
        // const maxAttempts = 3;
        // let attempt = 1;
        // let jobCompleted = false;
        // let jobStatus;
        //
        // while (attempt <= maxAttempts && !jobCompleted) {
        //     try {
        //         console.log(`Attempt ${attempt} to check job status...`);
        //         jobStatus = await elastictranscoder.readJob({ Id: jobId }).promise();
        //         if (jobStatus.Job.Status === 'Complete') {
        //             jobCompleted = true;
        //             console.log("Transcoding job completed successfully.");
        //         } else {
        //             console.log("Job not yet complete. Status:", jobStatus.Job.Status);
        //         }
        //     } catch (err) {
        //         console.error("Error checking job status:", err);
        //     }
        //     attempt++;
        // }
        //
        // if (!jobCompleted) {
        //     console.error("Job completion not detected after maximum attempts.");
        //     return {
        //         statusCode: 500,
        //         body: JSON.stringify('Transcoding job completion not detected.'),
        //     };
        // }
        //
        // const endTime = new Date().toISOString();
        // console.log("End time=" + endTime);

        return {
            statusCode: 200,
            body: JSON.stringify('Transcoding job completed successfully.'),
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify('Error processing transcoding job.'),
        };
    }
};
