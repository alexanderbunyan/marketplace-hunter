import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Deal {
    id: string;
    title: string;
    price: string;
    url: string;
    description?: string;
    reason?: string;
    screenshot?: string;
    location?: string;
    image_url?: string;
    deal_rating?: number;
    flipper_comment?: string;
    estimated_new_price?: number;
    visual_brand_model?: string;
    visual_condition?: string;
    visual_tier?: string;
    ai_analysis?: {
        is_steal: boolean;
        reason: string;
        resale_price_estimate: string;
    };
    verification?: {
        verified: boolean;
        notes: string;
        score: number;
    }
}

export interface ScanResult {
    status: 'running' | 'complete' | 'failed';
    stage: 'initializing' | 'scraped' | 'analyzed' | 'ranked' | 'complete';
    stats: {
        total_duration_seconds: number;
        total_cost_usd: number;
        total_tokens: { input: number; output: number };
        steps?: Record<string, { duration_seconds: number; cost_usd: number; tokens: { input: number; output: number } }>;
        start_time?: string;
        output_dir?: string;
    } | null;
    results: Deal[] | null;
    inventory?: Deal[] | null;
}

export interface Job {
    scan_id: string;
    start_time: string;
    end_time: string | null;
    status: 'running' | 'complete' | 'failed';
    query?: string;
    location?: string;
    source?: string;
}

// Scans
export const startScan = async (query: string, location: string, radius: number, minListings: number, userIntent?: string) => {
    const response = await axios.post(`${API_URL}/scan`, {
        query,
        location,
        radius,
        min_listings: minListings,
        user_intent: userIntent
    });
    return response.data;
};

export const getScanStatus = async (scanId: string): Promise<ScanResult> => {
    const response = await axios.get(`${API_URL}/scan/${scanId}`);
    return response.data;
};

export const getScanLog = async (scanId: string): Promise<{ log: string }> => {
    const response = await axios.get(`${API_URL}/scan/${scanId}/log`);
    return response.data;
};

export const deleteJob = async (scanId: string): Promise<{ status: string }> => {
    const response = await axios.delete(`${API_URL}/scan/${scanId}`);
    return response.data;
};

// Jobs
export const getJobs = async (): Promise<{ jobs: Job[] }> => {
    const response = await axios.get(`${API_URL}/jobs`);
    return response.data;
};

// Schedules
export interface Schedule {
    id?: string;
    query: string;
    location: string;
    radius: number;
    min_listings: number;
    user_intent: string;
    frequency: 'daily' | 'weekly';
    time: string;
    email_to: string;
    active: boolean;
    last_run?: string;
}

export const getSchedules = async (): Promise<{ schedules: Schedule[] }> => {
    const response = await axios.get(`${API_URL}/schedules`);
    return response.data;
};

export const saveSchedule = async (schedule: Schedule) => {
    const response = await axios.post(`${API_URL}/schedules`, schedule);
    return response.data;
};

export const deleteSchedule = async (id: string) => {
    const response = await axios.delete(`${API_URL}/schedules/${id}`);
    return response.data;
};

export const runSchedule = async (id: string) => {
    const response = await axios.post(`${API_URL}/schedules/${id}/run`);
    return response.data;
};

// Settings
export interface Settings {
    smtp_server: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    default_email: string;
}

export const getSettings = async (): Promise<Settings> => {
    const response = await axios.get(`${API_URL}/settings`);
    return response.data;
};

export const saveSettings = async (settings: Settings) => {
    const response = await axios.post(`${API_URL}/settings`, settings);
    return response.data;
};
