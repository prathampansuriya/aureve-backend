import { Address } from '../models/Address.js';
import { NotFoundError, ForbiddenError } from '../utils/AppError.js';

export class AddressService {
  /**
   * Retrieves all addresses owned by customer, sorted with defaults first.
   */
  async getAddresses(userId) {
    return Address.find({ userId }).sort({ isDefaultShipping: -1, isDefaultBilling: -1, createdAt: -1 });
  }

  /**
   * Retrieves a single address with strict customer ownership check.
   */
  async getAddressById(userId, addressId) {
    const address = await Address.findById(addressId);
    if (!address) {
      throw new NotFoundError('Address not found.');
    }
    if (address.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to access this address.');
    }
    return address;
  }

  /**
   * Creates a new address for customer.
   * If customer has no previous addresses, automatically sets as default shipping & billing.
   */
  async createAddress(userId, addressData) {
    const existingCount = await Address.countDocuments({ userId });
    const isFirst = existingCount === 0;

    const shouldBeDefaultShipping = isFirst || Boolean(addressData.isDefaultShipping);
    const shouldBeDefaultBilling = isFirst || Boolean(addressData.isDefaultBilling);

    if (shouldBeDefaultShipping) {
      await Address.updateMany({ userId }, { isDefaultShipping: false });
    }
    if (shouldBeDefaultBilling) {
      await Address.updateMany({ userId }, { isDefaultBilling: false });
    }

    const address = await Address.create({
      ...addressData,
      userId,
      isDefaultShipping: shouldBeDefaultShipping,
      isDefaultBilling: shouldBeDefaultBilling
    });

    return address;
  }

  /**
   * Updates an existing address with ownership check and default flag reconciliation.
   */
  async updateAddress(userId, addressId, addressData) {
    const address = await this.getAddressById(userId, addressId);

    if (addressData.isDefaultShipping) {
      await Address.updateMany({ userId, _id: { $ne: addressId } }, { isDefaultShipping: false });
    }
    if (addressData.isDefaultBilling) {
      await Address.updateMany({ userId, _id: { $ne: addressId } }, { isDefaultBilling: false });
    }

    Object.assign(address, addressData);
    await address.save();
    return address;
  }

  /**
   * Deletes an address and promotes another address to default if needed.
   */
  async deleteAddress(userId, addressId) {
    const address = await this.getAddressById(userId, addressId);
    const wasDefaultShipping = address.isDefaultShipping;
    const wasDefaultBilling = address.isDefaultBilling;

    await Address.findByIdAndDelete(addressId);

    // If deleted address was default, promote the newest remaining address
    if (wasDefaultShipping || wasDefaultBilling) {
      const remaining = await Address.findOne({ userId }).sort({ createdAt: -1 });
      if (remaining) {
        if (wasDefaultShipping) remaining.isDefaultShipping = true;
        if (wasDefaultBilling) remaining.isDefaultBilling = true;
        await remaining.save();
      }
    }

    return { message: 'Address removed successfully.' };
  }

  /**
   * Sets an address as the customer's default shipping destination.
   */
  async setDefaultShipping(userId, addressId) {
    const address = await this.getAddressById(userId, addressId);
    await Address.updateMany({ userId, _id: { $ne: addressId } }, { isDefaultShipping: false });
    address.isDefaultShipping = true;
    await address.save();
    return address;
  }

  /**
   * Sets an address as the customer's default billing destination.
   */
  async setDefaultBilling(userId, addressId) {
    const address = await this.getAddressById(userId, addressId);
    await Address.updateMany({ userId, _id: { $ne: addressId } }, { isDefaultBilling: false });
    address.isDefaultBilling = true;
    await address.save();
    return address;
  }
}

export const addressService = new AddressService();
