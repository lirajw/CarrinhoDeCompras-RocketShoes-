import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { resolveTripleslashReference } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

     const storagedCart = localStorage.getItem('@RocketShoes:cart');

     if (storagedCart) {
         return JSON.parse(storagedCart);
        }

    return [];
    
  });

  const VerifyStock = async (productId: number) : Promise<Stock> => {
    return await api.get(`stock/${productId}`)
                    .then(response => response.data)
                    .catch(error => console.log(error));
  };

  const addProduct = async (productId: number) => {
    try {

      const productEdit = cart.find(product => product.id === productId);
      
      const verifyStock: Stock = await VerifyStock(productId);

      if((productEdit?.amount ?? 0) + 1 > verifyStock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }  

      if(productEdit){

          updateProductAmount({
            productId : productId,
            amount: productEdit.amount + 1
          })                      
        
      }else {
  
        const newProduct: Product = await api.get(`products/${productId}`)
                                    .then(response => response.data)
                                    .catch(error => console.log(error));
        
        newProduct.amount = 1;

        const newCart = [...cart, newProduct];
        setCart(newCart);   
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));     
      }
      

    } catch(error) {
      toast.error('Erro na adição do produto');
      console.log(error);
    }
  };

  const removeProduct = (productId: number) => {
    try {

        const verifyProduct = cart.find(product => product.id === productId);
        
        if(!verifyProduct){
          throw Error();
        }


          const newCart = cart.filter(product => product.id !== productId);
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount <= 0) {
        return;
      }

      const verifyStock: Stock = await VerifyStock(productId);

        if(amount > verifyStock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }  

      const productEdit = cart.find(product => product.id === productId);      
      
      if(productEdit) {
        
        const newCart = cart.map(product => product);

        newCart[newCart.findIndex(product => product.id === productEdit.id)].amount = amount;        

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))

      }
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
