"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/Button";

interface MotorcycleData {
  id: string;
  vin: string;
  model: string;
  year: number;
  price: number;
  brand: {
    nameEn: string;
    nameAr: string;
  };
}

export function AddToCartButton({
  motorcycle,
  label = "Add to Cart",
  className = "rounded-md border border-zinc-950 px-5 py-3 text-center text-sm font-bold text-zinc-950 transition hover:bg-zinc-950 hover:text-white flex items-center justify-center gap-2",
}: {
  motorcycle: MotorcycleData;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/motorcycles/${motorcycle.id}`);
      return;
    }

    setIsAdding(true);
    try {
      // Get current cart
      const currentCart = localStorage.getItem("cart");
      let cartItems = [];
      if (currentCart) {
        cartItems = JSON.parse(currentCart);
      }

      // Check if already in cart
      const existingItem = cartItems.find((item: any) => item.id === motorcycle.id);
      if (!existingItem) {
        cartItems.push(motorcycle);
        localStorage.setItem("cart", JSON.stringify(cartItems));
      }

      // Redirect to checkout
      router.push("/checkout");
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button 
      onClick={handleAddToCart}
      disabled={isAdding}
      className={className}
    >
      <ShoppingBag size={18} />
      {isAdding ? "Adding..." : label}
    </button>
  );
}
