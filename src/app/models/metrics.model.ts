export interface AdvisorMetric {
    advisorUid: string;
    total: number;
    contracts: {
        contractUid: string;
        amount: number;
        role: string;
    }[];
}

export interface ContractMetric {
    contractUid: string;
    totalCommission: number;
}

export interface DashboardMetricsVM {
    totalContracts: number;
    signedContracts: number;
    pendingContracts: number;

    totalCommissionGlobal: number;

    advisors: AdvisorMetric[];
    contracts: ContractMetric[];
}