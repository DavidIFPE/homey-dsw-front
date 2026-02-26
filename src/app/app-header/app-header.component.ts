import { Component, OnDestroy, OnInit } from "@angular/core";
import { NavigationEnd, Router, RouterModule } from "@angular/router";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { getUserFromToken, logout } from "../services/authService";

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './app-header.component.html',
    styleUrl: './app-header.css'
})
export class AppHeaderComponent implements OnInit, OnDestroy {
    userId: number | null = null;
    private routerSub?: Subscription;

    constructor(private router: Router) {}

    ngOnInit(): void {
        this.updateUser();

        this.routerSub = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                this.updateUser();
            });
    }

    ngOnDestroy(): void {
        this.routerSub?.unsubscribe();
    }

    private updateUser(): void {
        const user = getUserFromToken();
        this.userId = user?.id ? Number(user.id) : null;
    }

    get hasProfile(): boolean {
        return this.userId !== null && !isNaN(this.userId);
    }

    get isLoggedIn(): boolean {
        return !!getUserFromToken();
    }

    get isPrestador(): boolean {
        const user = getUserFromToken() as any;
        const tipo = user?.tipo || (Array.isArray(user?.roles) ? user.roles[0] : user?.roles);
        return tipo === 'PRESTADOR' || tipo === 'prestador';
    }

    async onLogout(): Promise<void> {
        try {
            await logout();
        } catch (error) {
            console.warn('Erro ao fazer logout no servidor, limpando sessão local mesmo assim.', error);
        } finally {
            this.router.navigate(['/']);
        }
    }
}