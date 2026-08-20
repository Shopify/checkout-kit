import Config from 'react-native-config';
import {BuyerIdentityMode} from '../auth/types';
import type {AppConfig} from '../context/Config';
import {createBuyerIdentityCartInput} from '../utils';

jest.mock('react-native-config', () => ({
  EMAIL: 'buyer@example.com',
  ADDRESS_1: '151 O Connor Street',
  ADDRESS_2: '',
  CITY: 'Ottawa',
  COMPANY: '',
  COUNTRY: 'CA',
  FIRST_NAME: 'Evelyn',
  LAST_NAME: 'Hartley',
  PROVINCE: 'ON',
  ZIP: 'K2P 2L8',
  PHONE: '+16135550142',
}));

describe('createBuyerIdentityCartInput', () => {
  it('adds a selected reusable delivery address to a hardcoded cart', () => {
    const input = createBuyerIdentityCartInput({
      buyerIdentityMode: BuyerIdentityMode.Hardcoded,
    } as AppConfig);

    expect(input).toEqual({
      buyerIdentity: {
        email: Config.EMAIL,
      },
      delivery: {
        addresses: [
          {
            address: {
              deliveryAddress: {
                address1: Config.ADDRESS_1,
                address2: Config.ADDRESS_2,
                city: Config.CITY,
                company: Config.COMPANY,
                countryCode: Config.COUNTRY,
                firstName: Config.FIRST_NAME,
                lastName: Config.LAST_NAME,
                phone: Config.PHONE,
                provinceCode: Config.PROVINCE,
                zip: Config.ZIP,
              },
            },
            selected: true,
          },
        ],
      },
    });
  });
});
