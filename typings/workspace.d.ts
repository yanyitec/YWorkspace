declare namespace YA {
    let trimRegx: RegExp;
    let intRegx: RegExp;
    let quoteRegx: RegExp;
    function trim(txt: string): string;
    class DataPath {
        fromRoot: boolean;
        constructor(path: string);
        getValue(data: any): void;
        setValue(data: any, value: any): DataPath;
    }
}
