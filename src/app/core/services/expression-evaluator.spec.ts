import { TestBed } from '@angular/core/testing';

import { ExpressionEvaluator } from './expression-evaluator.service';

describe('ExpressionEvaluator', () => {
    let service: ExpressionEvaluator;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ExpressionEvaluator);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
