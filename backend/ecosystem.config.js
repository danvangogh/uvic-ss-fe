module.exports = {
  apps: [
    {
      name: "uvic-ss-fe",
      script: "./server.js", // Make sure this points to the relative path of your server.js
      cwd: "/var/www/uvic-ss-fe/backend", // Set the correct working directory
      env: {
        PORT: 3000,
        AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
        AIRTABLE_PERSONAL_ACCESS_TOKEN:
          process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
        AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
        AIRTABLE_PERSONAL_ACCESS_TOKEN:
          process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
        AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME,
      },
    },
  ],
};
