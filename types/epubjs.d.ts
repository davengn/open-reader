declare module "epubjs" {
  export interface Book {
    opened: Promise<Book>;
    ready: Promise<any>;
    navigation: Navigation;
    spine: Spine;
    renderTo(element: string | HTMLElement, options?: any): Rendition;
    destroy(): void;
  }

  export interface Navigation {
    toc: TocItem[];
    get(href: string): TocItem | undefined;
  }

  export interface TocItem {
    id: string;
    label: string;
    href: string;
    subitems?: TocItem[];
  }

  export interface Spine {
    get(hrefOrId: string): any;
  }

  export interface Rendition {
    display(target?: string): Promise<any>;
    next(): Promise<any>;
    prev(): Promise<any>;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    themes: Themes;
    annotations: Annotations;
    destroy(): void;
    location: any;
    currentLocation(): any;
  }

  export interface Themes {
    fontSize(size: string): void;
    font(fontName: string): void;
    default(rules: any): void;
  }

  export interface Annotations {
    add(type: string, cfiRange: string, data?: any, cb?: any, className?: string, styles?: any): void;
    remove(cfiRange: string, type: string): void;
  }

  export default function ePub(urlOrData: string | ArrayBuffer, options?: any): Book;
}
