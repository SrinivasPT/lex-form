import { ControlDefinition } from '../models/form-schema.interface';

// This is the "Master List" of all known business fields
export const GLOBAL_CONTROL_LIBRARY: Record<string, ControlDefinition> = {
    // 1. Standard Text
    'employee.firstName': {
        key: 'firstName',
        type: 'text',
        label: 'First Name',
        placeholder: 'Enter first name',
        validators: { required: true, minLength: 2 },
    },

    'employee.lastName': {
        key: 'lastName',
        type: 'text',
        label: 'Last Name',
        validators: { required: true },
    },

    // 2. Standard Email
    'employee.email': {
        key: 'email',
        type: 'text',
        label: 'Email Address',
        validators: { required: true, email: true },
    },

    // 3. Domain-Driven Select (Country)
    'address.country': {
        key: 'countryId',
        type: 'select',
        label: 'Country',
        domainConfig: {
            categoryCode: 'COUNTRY',
        },
    },

    // 4. Dependent Select (State)
    'address.state': {
        key: 'stateId',
        type: 'select',
        label: 'State/Province',
        domainConfig: {
            categoryCode: 'STATE',
            dependentOn: 'countryId', // References the key of the parent
        },
        // Standard logic: Disable until country is picked
        disabledWhen: 'model.countryId == null',
    },
};
