import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface DomainValue {
    code: string | number;
    displayText: string;
    extension?: any;
}

@Injectable({
    providedIn: 'root',
})
export class DomainData {
    private cache = new Map<string, Observable<DomainValue[]>>();

    constructor(private http: HttpClient) {}

    getDomainValues(categoryCode: string, parentValue?: any): Observable<DomainValue[]> {
        const cacheKey = parentValue ? `${categoryCode}:${parentValue}` : categoryCode;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        let url = `http://localhost:3000/${categoryCode}`;
        if (parentValue) {
            url += `?country=${parentValue}`;
        }

        const request$ = this.http.get<DomainValue[]>(url).pipe(shareReplay(1));

        this.cache.set(cacheKey, request$);
        return request$;
    }
}
