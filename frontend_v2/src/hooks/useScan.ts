import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startScan, getScanStatus, getScanLog, getJobs, deleteJob, runSchedule } from '../api';

export const useScanStatus = (scanId: string | null) => {
    return useQuery({
        queryKey: ['scan', scanId],
        queryFn: () => getScanStatus(scanId!),
        enabled: !!scanId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'complete' || status === 'failed') return false;
            return 2000; // Poll every 2s while running
        },
    });
};

export const useScanLog = (scanId: string | null) => {
    return useQuery({
        queryKey: ['scan-log', scanId],
        queryFn: () => getScanLog(scanId!),
        enabled: !!scanId,
        refetchInterval: (query) => {
            // Stop polling log if scan is done? Maybe keep polling for a bit
            return 2000;
        }
    });
};

export const useJobs = () => {
    return useQuery({
        queryKey: ['jobs'],
        queryFn: getJobs,
    });
};

export const useStartScan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vars: { query: string; location: string; radius: number; minListings: number; userIntent?: string }) =>
            startScan(vars.query, vars.location, vars.radius, vars.minListings, vars.userIntent),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
};

export const useDeleteJob = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        }
    });
};
export const useRunSchedule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: runSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
};
