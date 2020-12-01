import { getRepository, Repository, In } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({
      name,
      price,
      quantity,
    });
    await this.ormRepository.save(product);
    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = await this.ormRepository.findOne({
      where: {
        name,
      },
    });
    return product;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const allProducts = await this.ormRepository.find({
      where: {
        id: In(products.map(x => x.id)),
      },
    });
    return allProducts;
  }

  public async updateQuantity(
    incomingProducts: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    let productList = await this.ormRepository.findByIds(
      incomingProducts.map(x => x.id),
    );
    productList = productList.map(product => {
      const incomingProduct = incomingProducts.find(x => x.id === product.id);
      if (!incomingProduct) return product;
      return {
        ...product,
        quantity: incomingProduct.quantity,
      };
    });
    await this.ormRepository.save(productList);
    return productList;
  }
}

export default ProductsRepository;
