declare class DynamicPage {
    orgCategoryConfigs: any;
    blCategoryConfigs: any;
    viewType: string;
    element: HTMLElement;
    contentComponent: any;
    data: any;
    fields: {
        [name: string]: any;
    };
    constructor(opts: any);
    init(): void;
    initEditPage(): void;
    initCagetories(sel: any, cfgs: any): any;
    initContent(): void;
    makeFields(): any;
}
declare function ajax(opts: any): any;
declare var orgCategoryConfigs: {
    "meeting": {
        "label": string;
        "fields": {
            "Title": {
                type: string;
                label: string;
                validations: {
                    required: boolean;
                    length: {
                        min: number;
                        max: number;
                    };
                };
            };
            "MeetingNo": {
                type: string;
                label: string;
            };
            "Summary": {
                type: string;
                label: string;
                validations: {
                    length: {
                        max: number;
                    };
                };
            };
        };
    };
    "leader": {
        "label": string;
        "type": string;
    };
};
declare var blCategoryConfigs: {
    "check": {
        "label": string;
        "fields": {
            Title: {
                label: string;
                type: string;
                validations: {
                    required: boolean;
                    length: {
                        min: number;
                        max: number;
                    };
                };
            };
            Category: {
                label: string;
                type: string;
                items: {
                    url: string;
                };
                validations: {
                    required: boolean;
                };
            };
        };
    };
    "exception": {
        "label": string;
        "fields": {
            Title: {
                label: string;
                type: string;
                validations: {
                    required: boolean;
                    length: {
                        min: number;
                        max: number;
                    };
                };
            };
            Location: {
                label: string;
                type: string;
                validations: {
                    length: {
                        max: number;
                    };
                };
            };
        };
    };
};
