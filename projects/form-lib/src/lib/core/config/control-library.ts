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

    'employee.hasNickName': {
        key: 'hasNickName',
        type: 'checkbox',
        label: 'Has Nickname',
        validators: { required: true },
    },

    // 2. Standard Email
    'employee.email': {
        key: 'email',
        type: 'text',
        label: 'Email Address',
        validators: { required: true, email: true },
    },

    'address.street': {
        key: 'street',
        type: 'text',
        label: 'Street Address',
        categoryCode: 'COUNTRY',
    },

    'address.city': {
        key: 'city',
        type: 'text',
        label: 'City',
    },

    // 3. Domain-Driven Select (Country)
    'address.countryCode': {
        key: 'countryCode',
        type: 'select',
        label: 'Country',
        categoryCode: 'country',
    },

    // 4. Dependent Select (State)
    'address.stateCode': {
        key: 'stateCode',
        type: 'select',
        label: 'State/Province',
        categoryCode: 'state',
        dependentOn: 'countryCode', // References the key of the parent
        // Standard logic: Disable until country is picked
        disabledWhen: 'model.countryCode == null',
    },

    // 5. Tree Control (Hierarchical Selection)
    'employee.department': {
        key: 'department',
        type: 'tree',
        label: 'Department',
        categoryCode: 'department',
        validators: { required: true },
    },

    'organization.division': {
        key: 'division',
        type: 'tree',
        label: 'Division',
        options: [
            { label: 'Engineering', value: 'ENG' },
            { label: 'Frontend', value: 'ENG-FE' },
            { label: 'Backend', value: 'ENG-BE' },
            { label: 'Sales', value: 'SALES' },
            { label: 'Enterprise', value: 'SALES-ENT' },
        ],
    },
};
