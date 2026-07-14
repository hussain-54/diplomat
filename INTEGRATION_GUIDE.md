# Manual Supabase & Vercel Integration Guide

This guide provides step-by-step instructions to manually set up your Supabase database, seed it with sample news/articles, configure your local environment, and deploy the application to Vercel.

---

## Part 1: Supabase Database Setup

### Step 1: Create a Supabase Project
1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New Project** in your dashboard.
3. Select your Organization, enter a **Project Name** (e.g., `Diplomacy Hub`), set a secure **Database Password**, and choose a hosting region close to your users.
4. Click **Create New Project** and wait a few minutes for the database instance to provision.

### Step 2: Initialize Database Schema and Seed Data
1. Once your project is ready, navigate to the **SQL Editor** from the left-hand sidebar (represented by a terminal icon with `SQL` inside).
2. Click **New Query** -> **Blank Query**.
3. Open the database setup script in this repository: [supabase/schema.sql](https://raw.githubusercontent.com/hussain-54/diplomacy/main/supabase/schema.sql).
4. Copy the entire contents of the SQL script.
5. Paste the copied SQL code into the Supabase SQL Editor text box.
6. Click the **Run** button at the bottom right.
7. Verify that the query executes successfully. This constructs all table relations, enums, triggers, storage buckets, RLS security policies, and populates the platform with initial articles, ambassadors, and news ticker feeds.

### Step 3: Get Database API Credentials
1. Navigate to **Project Settings** (the gear icon at the bottom of the left sidebar).
2. Go to the **API** tab.
3. Locate and copy the following two keys:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **anon / public** Key (this is your client-safe publishable key)

---

## Part 2: Local Development Setup

To run the application locally on your computer:

1. Open your terminal in the project directory.
2. Create or edit your local `.env` file and input your keys:
   ```env
   VITE_SUPABASE_PROJECT_ID="your-project-ref-id"
   VITE_SUPABASE_URL="https://your-project-ref-id.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-public-key"
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Run the local development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173` in your browser to view the running app.

---

## Part 3: Deploying to Vercel

### Step 1: Import the Repository
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository: `hussain-54/diplomacy`.

### Step 2: Configure Environment Variables
Before clicking "Deploy", expand the **Environment Variables** section and add the following two key-value pairs (you can use either the VITE_ prefixed version or the standard version, as the app is configured to support both):

| Key | Value |
| :--- | :--- |
| `SUPABASE_URL` | *Your Supabase Project URL* |
| `SUPABASE_PUBLISHABLE_KEY` | *Your Supabase Anon/Public Key* |

### Step 3: Build & Deploy
1. Ensure the **Framework Preset** is set to **Vite** (Vercel should auto-detect this).
2. The default build settings will be correct:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. Click **Deploy**.
4. Once completed, Vercel will provide your live URL. You can reload pages, read stories, and access the newsroom admin dashboard without any issues!
