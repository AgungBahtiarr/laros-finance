export interface DateRange {
	start: string;
	end: string;
}

export interface AccountBalance {
	id: number;
	code: string;
	name: string;
	type: string;
	level: number;
	debit: number;
	credit: number;
	balance: number;
	groupCode?: string;
	groupName?: string;
	parentId?: number;
}

export interface ReportFilters {
	dateRange: DateRange;
	showPercentages?: boolean;
	compareWithPrevious?: boolean;
	selectedAccounts?: string[];
	includeSubAccounts?: boolean;
}