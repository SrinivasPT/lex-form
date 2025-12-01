import { TestBed } from '@angular/core/testing';

import { DomainData } from './domain-data.service';

describe('DomainData', () => {
    let service: DomainData;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(DomainData);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
