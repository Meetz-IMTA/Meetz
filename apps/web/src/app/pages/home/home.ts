import { Component } from '@angular/core';
import { HeroSection } from './components/hero-section/hero-section';
import { FeaturedEvents } from './components/featured-events/featured-events';
import { CategoriesSection } from './components/categories-section/categories-section';

@Component({
  selector: 'app-home',
  imports: [HeroSection, FeaturedEvents, CategoriesSection],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
