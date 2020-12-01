import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository') private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({
    customer_id,
    products: selectedProducts,
  }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer does not exist');
    }
    if (selectedProducts.some(x => x.quantity <= 0)) {
      throw new AppError('Some of the sent products has an invalid quantity');
    }
    const productList = await this.productsRepository.findAllById(
      selectedProducts,
    );

    const hasInvalidProducts = selectedProducts.some(
      selectedProduct =>
        !productList.some(
          existingProduct => existingProduct.id === selectedProduct.id,
        ),
    );

    if (hasInvalidProducts) {
      throw new AppError('There are invalid products selected');
    }

    const formattedProducts = productList.map(product => {
      const newProduct = product;
      const { quantity: selectedQuantity } = selectedProducts.find(
        x => x.id === product.id,
      ) as IProduct;
      newProduct.quantity -= selectedQuantity;
      return { newProduct, selectedQuantity };
    });

    if (formattedProducts.some(({ newProduct }) => newProduct.quantity < 0)) {
      throw new AppError('There are some products unavailable to buy now.');
    }

    await this.productsRepository.updateQuantity(
      formattedProducts.map(({ newProduct }) => ({
        id: newProduct.id,
        quantity: newProduct.quantity,
      })),
    );

    const order = await this.ordersRepository.create({
      customer,
      products: formattedProducts.map(
        ({ newProduct: { price, id: product_id }, selectedQuantity }) => ({
          price,
          product_id,
          quantity: selectedQuantity,
        }),
      ),
    });
    return order;
  }
}

export default CreateOrderService;
